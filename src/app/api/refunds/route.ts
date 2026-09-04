import { db } from "@/lib/db";
import {
  ApiError, beginMutation, conflict, handler, jsonCreated, notFoundError, readJson,
} from "@/lib/api";
import { refundRequestSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/settings";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * A student files a refund request.
 *
 * This creates a REQUESTED record and nothing else — no money moves and access
 * is untouched until an administrator approves it (see /api/admin/refunds).
 * The refund window is enforced server-side from the platform settings.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { purchaseId, reason } = await readJson(request, refundRequestSchema);

  const [settings, purchase] = await Promise.all([
    getSettings(),
    db.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true, userId: true, status: true, paidAt: true,
        amountMinor: true, currency: true, refundedAmountMinor: true,
        refunds: { where: { status: { in: ["REQUESTED", "APPROVED"] } }, select: { id: true } },
      },
    }),
  ]);

  if (!purchase || purchase.userId !== user.id) throw notFoundError("შენაძენი ვერ მოიძებნა");
  if (purchase.status !== "PAID") {
    throw conflict("დაბრუნება შესაძლებელია მხოლოდ გადახდილი შენაძენისთვის");
  }
  if (purchase.refunds.length > 0) throw conflict("დაბრუნების მოთხოვნა უკვე გაგზავნილია");

  const windowMs = settings.refundWindowDays * 24 * 60 * 60 * 1000;
  if (!purchase.paidAt || Date.now() - purchase.paidAt.getTime() > windowMs) {
    throw new ApiError(
      409,
      "REFUND_WINDOW_CLOSED",
      `დაბრუნების ვადა (${settings.refundWindowDays} დღე) ამოიწურა`,
    );
  }

  const refund = await db.refund.create({
    data: {
      purchaseId: purchase.id,
      // Requests are always for the full remaining amount; an admin may
      // reduce it when approving.
      amountMinor: purchase.amountMinor - purchase.refundedAmountMinor,
      currency: purchase.currency,
      reason,
      status: "REQUESTED",
      requestedById: user.id,
    },
    select: { id: true, status: true, amountMinor: true },
  });

  await audit({
    actorId: user.id,
    action: AUDIT_ACTIONS.REFUND_REQUESTED,
    targetType: "Refund",
    targetId: refund.id,
    summary: reason.slice(0, 200),
    metadata: { purchaseId: purchase.id, amountMinor: refund.amountMinor },
  });

  return jsonCreated(refund);
});
