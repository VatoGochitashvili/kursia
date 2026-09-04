import { db } from "@/lib/db";
import {
  ApiError, beginMutation, conflict, handler, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { adminRefundSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/rbac";
import { processRefund } from "@/lib/payments/fulfillment";
import { getProvider } from "@/lib/payments";
import { toMinor } from "@/lib/money";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Approve or reject a refund request.
 *
 * On approval we attempt the provider refund FIRST. Only if the money actually
 * moved (or the provider has no refund API, e.g. bank transfer) do we run
 * `processRefund`, which reverses the ledger and revokes access. Doing it the
 * other way round would let a failed provider call leave the books saying a
 * refund happened when it did not.
 */
export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  const refund = await db.refund.findUnique({
    where: { id },
    select: {
      id: true, status: true, amountMinor: true, currency: true,
      purchase: {
        select: {
          id: true, reference: true, userId: true, amountMinor: true, refundedAmountMinor: true,
          transactions: {
            where: { status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { provider: true, providerTxnId: true, providerOrderId: true },
          },
        },
      },
    },
  });
  if (!refund) throw notFoundError("დაბრუნება ვერ მოიძებნა");
  if (refund.status === "PROCESSED") throw conflict("დაბრუნება უკვე დამუშავებულია");

  const body = await readJson(request, adminRefundSchema);

  if (body.action === "REJECT") {
    await db.refund.update({
      where: { id },
      data: { status: "REJECTED", handledById: admin.id, processedAt: new Date() },
    });
    await audit({
      actorId: admin.id,
      action: AUDIT_ACTIONS.REFUND_REJECTED,
      targetType: "Refund",
      targetId: id,
      summary: body.note ?? "",
    });
    await notify({
      userId: refund.purchase.userId,
      type: "REFUND_PROCESSED",
      title: "დაბრუნების მოთხოვნა უარყოფილია",
      body: body.note ?? "",
      linkUrl: "/dashboard/purchases",
    });
    return jsonOk({ ok: true, status: "REJECTED" });
  }

  // An admin may approve a smaller amount than requested.
  const remaining = refund.purchase.amountMinor - refund.purchase.refundedAmountMinor;
  const amountMinor =
    body.amount !== undefined ? toMinor(body.amount, refund.currency) : refund.amountMinor;
  if (amountMinor <= 0 || amountMinor > remaining) {
    throw new ApiError(400, "INVALID_AMOUNT", "დასაბრუნებელი თანხა არასწორია");
  }

  const transaction = refund.purchase.transactions[0];
  let providerRefundId: string | undefined;

  if (transaction?.providerTxnId || transaction?.providerOrderId) {
    const provider = getProvider(transaction.provider);
    if (provider.refund) {
      const result = await provider.refund({
        providerTxnId: transaction.providerTxnId ?? transaction.providerOrderId!,
        amountMinor,
        currency: refund.currency,
      });
      if (!result.ok) {
        await db.refund.update({
          where: { id },
          data: { status: "FAILED", handledById: admin.id },
        });
        throw new ApiError(
          502,
          "PROVIDER_REFUND_FAILED",
          result.message ?? "პროვაიდერთან დაბრუნება ვერ შესრულდა",
        );
      }
      providerRefundId = result.providerRefundId;
    }
    // A provider without a refund API (bank transfer) is settled by hand; the
    // ledger reversal below still runs so the books stay correct.
  }

  await db.refund.update({
    where: { id },
    data: {
      amountMinor,
      revokeAccess: body.revokeAccess,
      providerRefundId: providerRefundId ?? null,
      status: "APPROVED",
      handledById: admin.id,
    },
  });

  await processRefund({ refundId: id, actorId: admin.id });

  return jsonOk({ ok: true, status: "PROCESSED", amountMinor });
});
