import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  ProviderDescriptor,
  ProviderPaymentStatus,
  RefundInput,
  RefundResult,
  WebhookVerification,
} from "./types";

/**
 * TBC Bank — E-Commerce (checkout) API.
 *
 * Flow: OAuth2 client-credentials token (with an `apikey` header) → create
 * payment → redirect the buyer to the returned link → TBC calls back, and the
 * callback is verified with an HMAC over the raw body using TBC_WEBHOOK_SECRET.
 *
 * Set TBC_API_KEY / TBC_CLIENT_ID / TBC_CLIENT_SECRET / TBC_WEBHOOK_SECRET and
 * add "tbc" to PAYMENT_PROVIDERS. Confirm endpoint paths and the callback
 * signature scheme against the contract TBC issues you before going live.
 */
export class TbcPaymentProvider implements PaymentProvider {
  readonly id = "tbc";
  private token: { value: string; expiresAt: number } | null = null;

  private get configured() {
    return Boolean(env.TBC_API_KEY && env.TBC_CLIENT_ID && env.TBC_CLIENT_SECRET);
  }

  descriptor(): ProviderDescriptor {
    return {
      id: this.id,
      labelKa: "ბარათით გადახდა — თიბისი ბანკი",
      labelEn: "Card payment — TBC Bank",
      descriptionKa: "Visa / Mastercard. უსაფრთხო გადახდა TBC-ის საგადახდო გვერდზე.",
      descriptionEn: "Visa / Mastercard on TBC's secure hosted checkout.",
      icon: "💳",
      configured: this.configured,
      manualSettlement: false,
    };
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const res = await fetch(`${env.TBC_API_BASE}/v1/tpay/access-token`, {
      method: "POST",
      headers: { apikey: env.TBC_API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.TBC_CLIENT_ID,
        client_secret: env.TBC_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`TBC auth failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 600) * 1000,
    };
    return this.token.value;
  }

  async createPayment(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    if (!this.configured) {
      throw new Error("TBC provider is not configured (TBC_API_KEY / TBC_CLIENT_ID / TBC_CLIENT_SECRET).");
    }
    const token = await this.accessToken();

    const res = await fetch(`${env.TBC_API_BASE}/v1/tpay/payments`, {
      method: "POST",
      headers: {
        apikey: env.TBC_API_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: input.currency, total: Number((input.amountMinor / 100).toFixed(2)) },
        returnurl: input.returnUrl,
        callbackUrl: input.callbackUrl,
        preAuth: false,
        language: input.locale === "en" ? "EN" : "KA",
        merchantPaymentId: input.transactionId,
        extra: input.purchaseReference,
      }),
    });
    if (!res.ok) throw new Error(`TBC create payment failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as {
      payId: string;
      links?: { uri?: string; method?: string; rel?: string }[];
    };
    const redirectUrl = data.links?.find((l) => l.rel === "approve" || l.method === "REDIRECT")?.uri;
    if (!redirectUrl) throw new Error("TBC response contained no approval link");

    return { redirectUrl, providerOrderId: data.payId, status: "PENDING", raw: data };
  }

  async verifyWebhook(request: Request, rawBody: string): Promise<WebhookVerification> {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        ok: false,
        reason: "malformed JSON body",
        dedupeKey: `tbc:bad:${Date.now()}`,
        status: "UNKNOWN",
        raw: rawBody,
      };
    }

    const providerOrderId = String(payload.PaymentId ?? payload.payId ?? "");
    const statusRaw = String(payload.status ?? payload.Status ?? "");
    const dedupeKey = `tbc:${providerOrderId}:${statusRaw}`;

    const signature =
      request.headers.get("x-tbc-signature") ?? request.headers.get("signature") ?? "";

    if (!env.TBC_WEBHOOK_SECRET || !signature) {
      return {
        ok: false,
        reason: !signature ? "missing signature header" : "TBC_WEBHOOK_SECRET not configured",
        dedupeKey,
        status: "UNKNOWN",
        providerOrderId,
        raw: payload,
      };
    }

    const expected = createHmac("sha256", env.TBC_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const a = Buffer.from(signature.toLowerCase());
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return {
        ok: false,
        reason: "signature verification failed",
        dedupeKey,
        status: "UNKNOWN",
        providerOrderId,
        raw: payload,
      };
    }

    return {
      ok: true,
      dedupeKey,
      eventType: `payment.${statusRaw.toLowerCase()}`,
      providerOrderId,
      providerTxnId: String(payload.recurringCard ?? providerOrderId),
      status: mapTbcStatus(statusRaw),
      currency: String((payload.amount as { currency?: string } | undefined)?.currency ?? "GEL"),
      raw: payload,
    };
  }

  async fetchStatus(providerOrderId: string): Promise<ProviderPaymentStatus> {
    const token = await this.accessToken();
    const res = await fetch(
      `${env.TBC_API_BASE}/v1/tpay/payments/${encodeURIComponent(providerOrderId)}`,
      { headers: { apikey: env.TBC_API_KEY, Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return "UNKNOWN";
    const data = (await res.json()) as { status?: string };
    return mapTbcStatus(data.status ?? "");
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const token = await this.accessToken();
    const res = await fetch(`${env.TBC_API_BASE}/v1/tpay/payments/refund`, {
      method: "POST",
      headers: {
        apikey: env.TBC_API_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "payment-id": input.providerTxnId,
        amount: Number((input.amountMinor / 100).toFixed(2)),
      }),
    });
    if (!res.ok) return { ok: false, message: `TBC refund failed: ${res.status}` };
    return { ok: true, providerRefundId: input.providerTxnId };
  }
}

function mapTbcStatus(status: string): ProviderPaymentStatus {
  switch (status.toLowerCase()) {
    case "succeeded":
    case "success":
    case "performed":
      return "SUCCEEDED";
    case "created":
    case "pending":
    case "processing":
      return "PENDING";
    case "failed":
    case "declined":
      return "FAILED";
    case "cancelled":
    case "canceled":
    case "expired":
      return "CANCELLED";
    case "refunded":
    case "partiallyrefunded":
      return "REFUNDED";
    default:
      return "UNKNOWN";
  }
}
