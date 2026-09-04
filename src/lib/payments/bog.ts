import { createVerify } from "node:crypto";
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
 * Bank of Georgia — Payments (iPay) API.
 *
 * Flow: OAuth2 client-credentials token → create order → redirect the buyer to
 * the returned `redirect` link → BOG POSTs a callback signed with an RSA
 * signature in the `Callback-Signature` header, verified against BOG's public
 * key (BOG_PUBLIC_KEY).
 *
 * Set BOG_CLIENT_ID / BOG_CLIENT_SECRET / BOG_PUBLIC_KEY to activate, and add
 * "bog" to PAYMENT_PROVIDERS. Endpoint paths follow BOG's published API; verify
 * them against the contract you are issued, as banks version these.
 */
export class BogPaymentProvider implements PaymentProvider {
  readonly id = "bog";
  private token: { value: string; expiresAt: number } | null = null;

  private get configured() {
    return Boolean(env.BOG_CLIENT_ID && env.BOG_CLIENT_SECRET);
  }

  descriptor(): ProviderDescriptor {
    return {
      id: this.id,
      labelKa: "ბარათით გადახდა — საქართველოს ბანკი",
      labelEn: "Card payment — Bank of Georgia",
      descriptionKa: "Visa / Mastercard / Apple Pay / Google Pay. უსაფრთხო 3-D Secure გადახდა.",
      descriptionEn: "Visa / Mastercard / Apple Pay / Google Pay via 3-D Secure.",
      icon: "💳",
      configured: this.configured,
      manualSettlement: false,
    };
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const basic = Buffer.from(`${env.BOG_CLIENT_ID}:${env.BOG_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${env.BOG_API_BASE}/auth/v1/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    if (!res.ok) throw new Error(`BOG auth failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 600) * 1000,
    };
    return this.token.value;
  }

  async createPayment(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    if (!this.configured) {
      throw new Error("BOG provider is not configured (BOG_CLIENT_ID / BOG_CLIENT_SECRET).");
    }
    const token = await this.accessToken();

    const body = {
      callback_url: input.callbackUrl,
      external_order_id: input.transactionId,
      purchase_units: {
        currency: input.currency,
        // BOG expects a decimal string in major units.
        total_amount: (input.amountMinor / 100).toFixed(2),
        basket: [
          {
            product_id: input.course.id,
            description: input.course.title,
            quantity: 1,
            unit_price: (input.amountMinor / 100).toFixed(2),
          },
        ],
      },
      redirect_urls: { success: input.returnUrl, fail: input.cancelUrl },
      ttl: 30,
    };

    const res = await fetch(`${env.BOG_API_BASE}/payments/v1/ecommerce/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Language": input.locale === "en" ? "en" : "ka",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`BOG create order failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as {
      id: string;
      _links?: { redirect?: { href?: string } };
    };
    const redirectUrl = data._links?.redirect?.href;
    if (!redirectUrl) throw new Error("BOG response contained no redirect link");

    return { redirectUrl, providerOrderId: data.id, status: "PENDING", raw: data };
  }

  /**
   * BOG signs the raw request body with its private key and sends the
   * base64 RSA-SHA256 signature in `Callback-Signature`. Fails closed if the
   * public key is absent — an unverifiable callback is never trusted.
   */
  async verifyWebhook(request: Request, rawBody: string): Promise<WebhookVerification> {
    const signature = request.headers.get("callback-signature") ?? "";
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        ok: false,
        reason: "malformed JSON body",
        dedupeKey: `bog:bad:${Date.now()}`,
        status: "UNKNOWN",
        raw: rawBody,
      };
    }

    const bodyData = (payload.body ?? payload) as Record<string, unknown>;
    const providerOrderId = String(bodyData.order_id ?? bodyData.id ?? "");
    const orderStatus = (bodyData.order_status as { key?: string } | undefined)?.key ?? "";
    const dedupeKey = `bog:${providerOrderId}:${orderStatus}`;

    if (!env.BOG_PUBLIC_KEY || !signature) {
      return {
        ok: false,
        reason: !signature ? "missing Callback-Signature header" : "BOG_PUBLIC_KEY not configured",
        dedupeKey,
        status: "UNKNOWN",
        providerOrderId,
        raw: payload,
      };
    }

    let signatureOk = false;
    try {
      const verifier = createVerify("RSA-SHA256");
      verifier.update(rawBody);
      verifier.end();
      signatureOk = verifier.verify(normalizePem(env.BOG_PUBLIC_KEY), signature, "base64");
    } catch {
      signatureOk = false;
    }

    if (!signatureOk) {
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
      eventType: String(payload.event ?? "order_payment"),
      providerOrderId,
      providerTxnId: String(bodyData.payment_hash ?? providerOrderId),
      status: mapBogStatus(orderStatus),
      amountMinor: readAmountMinor(bodyData),
      currency: String(
        (bodyData.purchase_units as { currency_code?: string } | undefined)?.currency_code ?? "GEL",
      ),
      failureCode: (bodyData.reject_reason as string | undefined) ?? undefined,
      raw: payload,
    };
  }

  async fetchStatus(providerOrderId: string): Promise<ProviderPaymentStatus> {
    const token = await this.accessToken();
    const res = await fetch(
      `${env.BOG_API_BASE}/payments/v1/receipt/${encodeURIComponent(providerOrderId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return "UNKNOWN";
    const data = (await res.json()) as { order_status?: { key?: string } };
    return mapBogStatus(data.order_status?.key ?? "");
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const token = await this.accessToken();
    const res = await fetch(
      `${env.BOG_API_BASE}/payments/v1/payment/refund/${encodeURIComponent(input.providerTxnId)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: (input.amountMinor / 100).toFixed(2) }),
      },
    );
    if (!res.ok) return { ok: false, message: `BOG refund failed: ${res.status}` };
    const data = (await res.json()) as { key?: string };
    return { ok: true, providerRefundId: data.key };
  }
}

function mapBogStatus(key: string): ProviderPaymentStatus {
  switch (key.toLowerCase()) {
    case "completed":
    case "success":
      return "SUCCEEDED";
    case "created":
    case "processing":
    case "in_progress":
      return "PENDING";
    case "rejected":
    case "failed":
      return "FAILED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    case "refunded":
    case "refund_requested":
      return "REFUNDED";
    default:
      return "UNKNOWN";
  }
}

function readAmountMinor(body: Record<string, unknown>): number | undefined {
  const units = body.purchase_units as
    | { transfer_amount?: string | number; request_amount?: string | number }
    | undefined;
  const raw = units?.transfer_amount ?? units?.request_amount;
  if (raw === undefined) return undefined;
  const n = typeof raw === "string" ? Number(raw) : raw;
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

/** Accepts a PEM with real newlines or with literal \n (as env vars carry it). */
function normalizePem(key: string): string {
  const body = key.replace(/\\n/g, "\n").trim();
  return body.includes("BEGIN")
    ? body
    : `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}
