import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { adminPayoutSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { notify, absoluteUrl } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Move a payout through its lifecycle.
 *
 * The balance arithmetic is the delicate part:
 *  • REQUESTED already reserved the amount (see /api/payouts).
 *  • PAID converts the reservation into a real debit: reserved ↓, available ↓,
 *    paidOut ↑, plus a PAYOUT ledger entry.
 *  • REJECTED / FAILED release the reservation so the creator can request again.
 * Each of those happens once, inside a transaction, guarded by the current
 * status so a double-click cannot debit twice.
 */
export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  const payout = await db.payout.findUnique({
    where: { id },
    select: {
      id: true, reference: true, status: true, amountMinor: true,
      currency: true, creatorId: true,
      creator: { select: { userId: true, displayName: true } },
    },
  });
  if (!payout) throw notFoundError("გატანა ვერ მოიძებნა");

  const body = await readJson(request, adminPayoutSchema);
  const terminal = ["PAID", "REJECTED", "FAILED"];
  if (terminal.includes(payout.status)) {
    throw conflict("ეს გატანა უკვე დასრულებულია");
  }

  const nextStatus = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    MARK_PROCESSING: "PROCESSING",
    MARK_PAID: "PAID",
    MARK_FAILED: "FAILED",
  }[body.action];

  await db.$transaction(async (tx) => {
    await tx.payout.update({
      where: { id },
      data: {
        status: nextStatus,
        adminNote: body.adminNote ?? null,
        providerRef: body.providerRef ?? null,
        ...(nextStatus === "PAID" || nextStatus === "REJECTED" || nextStatus === "FAILED"
          ? { processedAt: new Date() }
          : {}),
      },
    });

    if (nextStatus === "PAID") {
      await tx.creatorBalance.update({
        where: { creatorId: payout.creatorId },
        data: {
          reservedMinor: { decrement: payout.amountMinor },
          availableMinor: { decrement: payout.amountMinor },
          paidOutMinor: { increment: payout.amountMinor },
        },
      });
      await tx.balanceEntry.create({
        data: {
          creatorId: payout.creatorId,
          payoutId: payout.id,
          type: "PAYOUT",
          amountMinor: -payout.amountMinor,
          currency: payout.currency,
          description: `გატანა ${payout.reference}`,
        },
      });
    }

    // Releasing the reservation returns the funds to the withdrawable pool.
    if (nextStatus === "REJECTED" || nextStatus === "FAILED") {
      await tx.creatorBalance.update({
        where: { creatorId: payout.creatorId },
        data: { reservedMinor: { decrement: payout.amountMinor } },
      });
    }
  });

  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.PAYOUT_STATUS_CHANGED,
    targetType: "Payout",
    targetId: id,
    summary: `${payout.reference}: ${payout.status} → ${nextStatus}`,
    metadata: { amountMinor: payout.amountMinor, providerRef: body.providerRef },
  });

  if (nextStatus === "PAID" || nextStatus === "REJECTED") {
    await notify({
      userId: payout.creator.userId,
      type: nextStatus === "PAID" ? "PAYOUT_PAID" : "PAYOUT_REJECTED",
      title: nextStatus === "PAID" ? "თანხა გადარიცხულია" : "გატანა უარყოფილია",
      body: `${payout.reference} — ${formatMoney(payout.amountMinor, payout.currency)}`,
      linkUrl: "/dashboard/creator/payouts",
      email: {
        template: "payoutStatus",
        payload: {
          amount: formatMoney(payout.amountMinor, payout.currency),
          status: nextStatus,
          note: body.adminNote ?? "",
          url: absoluteUrl("/dashboard/creator/payouts"),
        },
      },
    });
  }

  return jsonOk({ ok: true, status: nextStatus });
});
