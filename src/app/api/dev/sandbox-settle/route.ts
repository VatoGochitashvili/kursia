import { z } from "zod";
import { env, isProd } from "@/lib/env";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { SandboxPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * DEVELOPMENT ONLY — stands in for the acquirer's own backend.
 *
 * When you press a button on a real bank's hosted page, the bank's server
 * signs a callback and delivers it to our webhook. There is no bank here, so
 * this endpoint plays that role: it signs the payload with the sandbox secret
 * and posts it to the very same webhook a live provider would call.
 *
 * Crucially, this changes nothing about the trust model:
 *  • It is hard-disabled in production and when PAYMENT_SANDBOX_ENABLED=false.
 *  • It never touches enrolments. It only delivers a signed webhook; the
 *    webhook handler still verifies the signature, matches the transaction and
 *    checks the amount before `fulfillPurchase` runs.
 *  • It only acts on a transaction belonging to the signed-in user.
 */
const bodySchema = z
  .object({
    order: z.string().min(1).max(120),
    outcome: z.enum(["success", "fail", "cancel"]),
  })
  .strict();

export const POST = handler(async (request) => {
  if (isProd || !env.PAYMENT_SANDBOX_ENABLED) {
    throw new ApiError(404, "NOT_FOUND", "Not available");
  }

  const user = await requireUser();
  await beginMutation("checkout", user.id);
  const { order, outcome } = await readJson(request, bodySchema);

  const transaction = await db.transaction.findFirst({
    where: { provider: "sandbox", providerOrderId: order, userId: user.id },
    select: { id: true, amountMinor: true, currency: true, purchase: { select: { reference: true } } },
  });
  if (!transaction) throw new ApiError(404, "NOT_FOUND", "ტრანზაქცია ვერ მოიძებნა");

  const payload = JSON.stringify({
    eventId: `${order}:${outcome}:${Date.now()}`,
    order,
    outcome,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
  });

  // Use the origin this request actually arrived on: the dev port is
  // assigned at launch and may not match APP_URL.
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/webhooks/payments/sandbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sandbox-signature": SandboxPaymentProvider.signBody(payload),
    },
    body: payload,
  });

  return jsonOk({
    delivered: response.ok,
    webhookStatus: response.status,
    reference: transaction.purchase.reference,
  });
});
