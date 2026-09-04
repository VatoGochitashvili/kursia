import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import type { BalanceEntryType } from "@/lib/enums";

/**
 * Creator earnings.
 *
 * `BalanceEntry` is an append-only ledger — the source of truth. `CreatorBalance`
 * is a materialised projection kept in step inside the same transaction, so
 * dashboards read one row instead of aggregating the ledger, while every tetri
 * remains traceable to the event that produced it.
 *
 * Money never becomes withdrawable immediately: a sale lands in `pendingMinor`
 * and only moves to `availableMinor` after the clearing window (refund window)
 * has passed. That is what stops a creator from cashing out a sale that is
 * later refunded.
 */

type Tx = Prisma.TransactionClient;

export async function ensureBalance(creatorId: string, client: Tx | typeof db = db) {
  const existing = await client.creatorBalance.findUnique({ where: { creatorId } });
  if (existing) return existing;
  const settings = await getSettings();
  return client.creatorBalance.create({
    data: { creatorId, currency: settings.currency },
  });
}

interface LedgerLine {
  type: BalanceEntryType;
  amountMinor: number;
  description?: string;
  purchaseId?: string;
  payoutId?: string;
  availableAt?: Date | null;
}

/**
 * Record a sale: credits pending earnings and books the fee lines.
 * Must be called inside the same transaction that marks the purchase PAID.
 */
export async function recordSale(
  client: Tx,
  input: {
    creatorId: string;
    purchaseId: string;
    currency: string;
    amountMinor: number;
    platformFeeMinor: number;
    processingFeeMinor: number;
    creatorEarningsMinor: number;
    clearingDays: number;
    courseTitle: string;
  },
): Promise<void> {
  const availableAt = new Date(Date.now() + input.clearingDays * 24 * 60 * 60 * 1000);

  const lines: LedgerLine[] = [
    {
      type: "SALE",
      amountMinor: input.amountMinor,
      description: `გაყიდვა: ${input.courseTitle}`,
      purchaseId: input.purchaseId,
      availableAt,
    },
    {
      type: "PLATFORM_FEE",
      amountMinor: -input.platformFeeMinor,
      description: "პლატფორმის საკომისიო",
      purchaseId: input.purchaseId,
    },
  ];
  if (input.processingFeeMinor > 0) {
    lines.push({
      type: "PROCESSING_FEE",
      amountMinor: -input.processingFeeMinor,
      description: "გადახდის დამუშავების საკომისიო",
      purchaseId: input.purchaseId,
    });
  }

  await client.balanceEntry.createMany({
    data: lines.map((l) => ({
      creatorId: input.creatorId,
      purchaseId: l.purchaseId ?? null,
      payoutId: null,
      type: l.type,
      amountMinor: l.amountMinor,
      currency: input.currency,
      description: l.description ?? null,
      availableAt: l.availableAt ?? null,
    })),
  });

  await client.creatorBalance.upsert({
    where: { creatorId: input.creatorId },
    create: {
      creatorId: input.creatorId,
      currency: input.currency,
      grossSalesMinor: input.amountMinor,
      platformFeeMinor: input.platformFeeMinor,
      processingFeeMinor: input.processingFeeMinor,
      pendingMinor: input.creatorEarningsMinor,
    },
    update: {
      grossSalesMinor: { increment: input.amountMinor },
      platformFeeMinor: { increment: input.platformFeeMinor },
      processingFeeMinor: { increment: input.processingFeeMinor },
      pendingMinor: { increment: input.creatorEarningsMinor },
    },
  });
}

/**
 * Reverse a creator's share of a refunded sale.
 * Takes from pending first, then from available — never leaves a negative
 * pending balance while available funds still exist.
 */
export async function recordRefund(
  client: Tx,
  input: {
    creatorId: string;
    purchaseId: string;
    currency: string;
    refundAmountMinor: number;
    creatorShareMinor: number;
    courseTitle: string;
  },
): Promise<void> {
  const balance = await client.creatorBalance.findUnique({
    where: { creatorId: input.creatorId },
  });

  const share = input.creatorShareMinor;
  const fromPending = Math.min(balance?.pendingMinor ?? 0, share);
  const fromAvailable = share - fromPending;

  await client.balanceEntry.create({
    data: {
      creatorId: input.creatorId,
      purchaseId: input.purchaseId,
      type: "REFUND",
      amountMinor: -share,
      currency: input.currency,
      description: `დაბრუნება: ${input.courseTitle}`,
    },
  });

  await client.creatorBalance.update({
    where: { creatorId: input.creatorId },
    data: {
      refundedMinor: { increment: input.refundAmountMinor },
      pendingMinor: { decrement: fromPending },
      availableMinor: { decrement: fromAvailable },
    },
  });
}

/**
 * Move cleared sales from pending to available. Idempotent: an entry is
 * cleared exactly once because `availableAt` is nulled as it moves.
 * Run from /api/cron/clear-earnings.
 */
export async function clearMaturedEarnings(now = new Date()): Promise<{ cleared: number; totalMinor: number }> {
  const matured = await db.balanceEntry.findMany({
    where: { type: "SALE", availableAt: { not: null, lte: now } },
    select: { id: true, creatorId: true, purchaseId: true, currency: true },
  });
  if (matured.length === 0) return { cleared: 0, totalMinor: 0 };

  let totalMinor = 0;

  for (const entry of matured) {
    // The creator's share is authoritative on the purchase row, not derived
    // again here — fees may have been configured differently at sale time.
    const purchase = entry.purchaseId
      ? await db.purchase.findUnique({
          where: { id: entry.purchaseId },
          select: { creatorEarningsMinor: true, status: true },
        })
      : null;

    // A refunded purchase must not clear into available funds.
    const share = purchase && purchase.status === "PAID" ? purchase.creatorEarningsMinor : 0;

    await db.$transaction(async (tx) => {
      await tx.balanceEntry.update({ where: { id: entry.id }, data: { availableAt: null } });
      if (share <= 0) return;
      await tx.creatorBalance.update({
        where: { creatorId: entry.creatorId },
        data: {
          pendingMinor: { decrement: share },
          availableMinor: { increment: share },
        },
      });
      await tx.balanceEntry.create({
        data: {
          creatorId: entry.creatorId,
          purchaseId: entry.purchaseId,
          type: "CLEARED",
          amountMinor: 0,
          currency: entry.currency,
          description: "თანხა გახდა ხელმისაწვდომი გამოსატანად",
        },
      });
    });

    totalMinor += share;
  }

  return { cleared: matured.length, totalMinor };
}

/** Snapshot for the creator payout screen. */
export async function getBalanceSummary(creatorId: string) {
  const balance = await ensureBalance(creatorId);
  const netEarnings =
    balance.grossSalesMinor -
    balance.platformFeeMinor -
    balance.processingFeeMinor -
    balance.refundedMinor;

  return {
    currency: balance.currency,
    grossSalesMinor: balance.grossSalesMinor,
    platformFeeMinor: balance.platformFeeMinor,
    processingFeeMinor: balance.processingFeeMinor,
    refundedMinor: balance.refundedMinor,
    netEarningsMinor: netEarnings,
    pendingMinor: balance.pendingMinor,
    availableMinor: balance.availableMinor,
    reservedMinor: balance.reservedMinor,
    paidOutMinor: balance.paidOutMinor,
    /** What the creator may actually request right now. */
    withdrawableMinor: Math.max(balance.availableMinor - balance.reservedMinor, 0),
  };
}
