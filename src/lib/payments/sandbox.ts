import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  ProviderDescriptor,
  RefundInput,
  RefundResult,
  WebhookVerification,
} from "./types";

/**
 * Development sandbox provider.
 *
 * This deliberately does NOT fake a successful payment. It behaves like a real
 * acquirer: it returns a hosted "payment page" URL (our own /checkout/sandbox
 * screen), leaves the transaction PENDING, and the purchase is only fulfilled
 * when a *signed* callback arrives at the webhook endpoint — the same code path
 * a live bank uses.
 *
 * The signature uses PAYMENT_SANDBOX_SECRET, so a student cannot settle their
 * own order by calling the webhook: they do not hold the secret.
 */
export class SandboxPaymentProvider implements PaymentProvider {
  readonly id = "sandbox";

  descriptor(): ProviderDescriptor {
    return {
      id: this.id,
      labelKa: "სატესტო გადახდა (Sandbox)",
      labelEn: "Sandbox payment (test)",
      descriptionKa:
        "მხოლოდ დეველოპმენტისთვის. რეალური თანხა არ ჩამოიჭრება — გადახდა დასტურდება ხელმოწერილი callback-ით.",
      descriptionEn:
        "Development only. No real money moves — settlement still requires a signed callback.",
      icon: "🧪",
      configured: env.PAYMENT_SANDBOX_ENABLED && env.NODE_ENV !== "production",
      manualSettlement: false,
    };
  }

  async createPayment(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const providerOrderId = `sbx_${input.transactionId}`;
    // Our own simulated bank page. It cannot settle the order by itself — it
    // posts to the webhook with an HMAC the server computes.
    const params = new URLSearchParams({
      order: providerOrderId,
      amount: String(input.amountMinor),
      currency: input.currency,
      ref: input.purchaseReference,
    });
    return {
      redirectUrl: `/checkout/sandbox?${params.toString()}`,
      providerOrderId,
      status: "PENDING",
    };
  }

  async verifyWebhook(request: Request, rawBody: string): Promise<WebhookVerification> {
    const signature = request.headers.get("x-sandbox-signature") ?? "";
    const expected = createHmac("sha256", env.PAYMENT_SANDBOX_SECRET)
      .update(rawBody)
      .digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const signatureOk = a.length === b.length && timingSafeEqual(a, b);

    let payload: {
      order?: string;
      outcome?: string;
      amountMinor?: number;
      currency?: string;
      eventId?: string;
    } = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        ok: false,
        reason: "malformed JSON body",
        dedupeKey: `sandbox:bad:${expected.slice(0, 32)}`,
        status: "UNKNOWN",
        raw: rawBody,
      };
    }

    if (!signatureOk) {
      return {
        ok: false,
        reason: "invalid signature",
        dedupeKey: `sandbox:unsigned:${payload.eventId ?? expected.slice(0, 32)}`,
        status: "UNKNOWN",
        providerOrderId: payload.order,
        raw: payload,
      };
    }

    const status =
      payload.outcome === "success"
        ? "SUCCEEDED"
        : payload.outcome === "cancel"
          ? "CANCELLED"
          : payload.outcome === "refund"
            ? "REFUNDED"
            : "FAILED";

    return {
      ok: true,
      dedupeKey: `sandbox:${payload.eventId ?? `${payload.order}:${payload.outcome}`}`,
      eventType: `payment.${payload.outcome}`,
      providerOrderId: payload.order,
      providerTxnId: payload.order,
      status,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      failureCode: status === "FAILED" ? "sandbox_declined" : undefined,
      failureMessage: status === "FAILED" ? "სატესტო უარყოფა" : undefined,
      raw: payload,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { ok: true, providerRefundId: `sbx_rf_${input.providerTxnId}` };
  }

  /** Signs a sandbox callback body the way a real acquirer would. */
  static signBody(rawBody: string): string {
    return createHmac("sha256", env.PAYMENT_SANDBOX_SECRET).update(rawBody).digest("hex");
  }
}
