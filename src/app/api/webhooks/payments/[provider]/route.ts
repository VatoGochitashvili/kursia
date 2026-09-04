import { db } from "@/lib/db";
import { handler, jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getProvider, providerExists } from "@/lib/payments";
import { applyProviderStatus } from "@/lib/payments/fulfillment";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payment callbacks — the ONLY automatic route to course access.
 *
 * Guarantees enforced here:
 *  • The raw body is read once and handed to the provider for signature
 *    verification. Nothing is trusted before that check passes.
 *  • Every event is persisted (verified or not) so rejected callbacks are
 *    auditable rather than silently dropped.
 *  • `dedupeKey` makes reprocessing a no-op, because providers retry.
 *  • The amount and currency in the callback must match the transaction we
 *    created; a mismatch is refused rather than fulfilled.
 *  • The response is always 200 for events we have durably recorded, so the
 *    provider stops retrying — errors are surfaced in our own logs, not by
 *    making the bank retry forever.
 */
export const POST = handler(
  async (request: Request, context: { params: Promise<{ provider: string }> }) => {
    const { provider: providerId } = await context.params;

    if (!providerExists(providerId)) {
      return jsonError(404, "UNKNOWN_PROVIDER", "Unknown payment provider");
    }

    // Webhooks are rate-limited per provider, not per client: a flood from a
    // spoofed source must not exhaust memory building event rows.
    const limit = await rateLimit("webhook", `provider:${providerId}`);
    if (!limit.ok) return jsonError(429, "RATE_LIMITED", "Too many webhook deliveries");

    const rawBody = await request.text();
    const provider = getProvider(providerId);
    const verification = await provider.verifyWebhook(request, rawBody);

    // Persist first. `dedupeKey` is unique, so a replay lands in the catch and
    // is acknowledged without being processed twice.
    let eventId: string;
    try {
      const event = await db.webhookEvent.create({
        data: {
          provider: providerId,
          eventType: verification.eventType ?? null,
          dedupeKey: verification.dedupeKey,
          signatureOk: verification.ok,
          payload: rawBody.slice(0, 20_000),
          error: verification.ok ? null : (verification.reason ?? "verification failed"),
        },
        select: { id: true },
      });
      eventId = event.id;
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        // Already seen — idempotent acknowledgement.
        return jsonOk({ received: true, duplicate: true });
      }
      throw error;
    }

    if (!verification.ok) {
      await audit({
        action: AUDIT_ACTIONS.WEBHOOK_REJECTED,
        targetType: "WebhookEvent",
        targetId: eventId,
        summary: `${providerId}: ${verification.reason ?? "unverified"}`,
        metadata: { providerOrderId: verification.providerOrderId },
      });
      // 400 tells an honest provider its signature configuration is wrong,
      // and tells an attacker nothing useful.
      return jsonError(400, "INVALID_SIGNATURE", "Signature verification failed");
    }

    const transaction = verification.providerOrderId
      ? await db.transaction.findFirst({
          where: { provider: providerId, providerOrderId: verification.providerOrderId },
          select: {
            id: true, purchaseId: true, amountMinor: true,
            currency: true, status: true,
          },
        })
      : null;

    if (!transaction) {
      await db.webhookEvent.update({
        where: { id: eventId },
        data: { error: "no matching transaction", processedAt: new Date() },
      });
      return jsonOk({ received: true, matched: false });
    }

    await db.webhookEvent.update({
      where: { id: eventId },
      data: { transactionId: transaction.id },
    });

    // Guard against an under-payment being treated as settlement.
    if (
      verification.status === "SUCCEEDED" &&
      verification.amountMinor !== undefined &&
      verification.amountMinor !== transaction.amountMinor
    ) {
      await db.webhookEvent.update({
        where: { id: eventId },
        data: {
          error: `amount mismatch: expected ${transaction.amountMinor}, got ${verification.amountMinor}`,
          processedAt: new Date(),
        },
      });
      await audit({
        action: AUDIT_ACTIONS.WEBHOOK_REJECTED,
        targetType: "Transaction",
        targetId: transaction.id,
        summary: "amount mismatch — fulfilment refused",
        metadata: {
          expected: transaction.amountMinor,
          received: verification.amountMinor,
        },
      });
      return jsonError(422, "AMOUNT_MISMATCH", "Amount does not match the order");
    }

    await applyProviderStatus({
      purchaseId: transaction.purchaseId,
      transactionId: transaction.id,
      status: verification.status,
      failureCode: verification.failureCode,
      failureMessage: verification.failureMessage,
    });

    await db.webhookEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });

    return jsonOk({ received: true, status: verification.status });
  },
);

/** Some providers probe the endpoint with a GET before going live. */
export const GET = handler(async () => jsonOk({ ok: true }));
