import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  ApiError, beginMutation, conflict, handler, jsonCreated, jsonOk, readJson,
} from "@/lib/api";
import { payoutRequestSchema, payoutMethodSchema } from "@/lib/validation";
import { requireCreator } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/settings";
import { getBalanceSummary } from "@/lib/earnings";
import { toMinor, formatMoney } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Creator payout request.
 *
 * The amount is checked against the *withdrawable* balance (cleared funds
 * minus anything already reserved by an in-flight request), and the request
 * immediately reserves that amount inside the same transaction. Two rapid
 * requests therefore cannot together exceed the balance.
 *
 * Actually moving money is an operator action: an admin marks the payout
 * PAID once the bank transfer is done (see /api/admin/payouts). Wiring a
 * real disbursement API in later means replacing that one step.
 */
export const POST = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);

  const [settings, body] = await Promise.all([
    getSettings(),
    readJson(request, payoutRequestSchema),
  ]);

  const amountMinor = toMinor(body.amount, settings.currency);
  if (amountMinor < settings.payoutMinimumMinor) {
    throw new ApiError(
      400,
      "BELOW_MINIMUM",
      `მინიმალური თანხა: ${formatMoney(settings.payoutMinimumMinor, settings.currency)}`,
    );
  }

  const method = body.methodId
    ? await db.payoutMethod.findFirst({
        where: { id: body.methodId, creatorId: creator.creatorId },
        select: { id: true },
      })
    : await db.payoutMethod.findFirst({
        where: { creatorId: creator.creatorId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { id: true },
      });
  if (!method) throw new ApiError(400, "NO_METHOD", "დაამატეთ საბანკო ანგარიში გატანამდე");

  const payout = await db.$transaction(async (tx) => {
    const balance = await tx.creatorBalance.findUnique({
      where: { creatorId: creator.creatorId },
      select: { availableMinor: true, reservedMinor: true, currency: true },
    });
    const withdrawable = Math.max(
      (balance?.availableMinor ?? 0) - (balance?.reservedMinor ?? 0),
      0,
    );
    if (amountMinor > withdrawable) {
      throw conflict(
        `ხელმისაწვდომი ბალანსი: ${formatMoney(withdrawable, settings.currency)}`,
      );
    }

    // Reserve immediately so the funds cannot be requested twice.
    await tx.creatorBalance.update({
      where: { creatorId: creator.creatorId },
      data: { reservedMinor: { increment: amountMinor } },
    });

    return tx.payout.create({
      data: {
        reference: `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomBytes(2)
          .toString("hex")
          .toUpperCase()}`,
        creatorId: creator.creatorId,
        methodId: method.id,
        amountMinor,
        currency: settings.currency,
        status: "REQUESTED",
        note: body.note ?? null,
      },
      select: { id: true, reference: true, amountMinor: true, currency: true, status: true },
    });
  });

  await audit({
    actorId: creator.id,
    action: AUDIT_ACTIONS.PAYOUT_REQUESTED,
    targetType: "Payout",
    targetId: payout.id,
    summary: `${payout.reference} — ${formatMoney(amountMinor, settings.currency)}`,
  });

  // Let administrators know there is money to move.
  const admins = await db.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      notify({
        userId: admin.id,
        type: "PAYOUT_REQUESTED",
        title: "ახალი გატანის მოთხოვნა",
        body: `${creator.fullName} — ${formatMoney(amountMinor, settings.currency)}`,
        linkUrl: "/admin/payouts",
      }),
    ),
  );

  return jsonCreated(payout);
});

/** Add or replace the creator's bank details. */
export const PUT = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);
  const body = await readJson(request, payoutMethodSchema);

  // Only one default at a time.
  if (body.isDefault !== false) {
    await db.payoutMethod.updateMany({
      where: { creatorId: creator.creatorId },
      data: { isDefault: false },
    });
  }

  const method = await db.payoutMethod.create({
    data: {
      creatorId: creator.creatorId,
      accountName: body.accountName,
      iban: body.iban,
      bankName: body.bankName ?? null,
      isDefault: body.isDefault !== false,
    },
    select: { id: true, accountName: true, iban: true, bankName: true, isDefault: true },
  });

  return jsonCreated(method);
});

/** Current balance snapshot — used by the payout form. */
export const GET = handler(async () => {
  const creator = await requireCreator();
  const balance = await getBalanceSummary(creator.creatorId);
  const settings = await getSettings();
  return jsonOk({ ...balance, minimumMinor: settings.payoutMinimumMinor });
});
