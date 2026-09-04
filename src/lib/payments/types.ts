/**
 * Payment provider contract.
 *
 * Rules that hold for every driver, without exception:
 *
 *  1. `createPayment` only ever produces a PENDING transaction plus a URL to
 *     redirect the buyer to. It NEVER grants course access.
 *  2. Access is granted in exactly one place — `fulfillPurchase()` in
 *     ./fulfillment.ts — and only from a webhook/callback whose signature this
 *     driver has verified, or from an explicit admin action.
 *  3. `verifyWebhook` must fail closed. If a signature cannot be checked, the
 *     event is stored and rejected, never trusted.
 *  4. The client is never believed about payment outcome. The success page
 *     re-reads the purchase from the database.
 */

export type ProviderPaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "UNKNOWN";

export interface PaymentIntentInput {
  /** Our transaction id — sent to the provider as its order reference. */
  transactionId: string;
  purchaseReference: string;
  amountMinor: number;
  currency: string;
  description: string;
  buyer: { id: string; email: string; name: string };
  course: { id: string; title: string; slug: string };
  locale: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  /** Deduplication key so a double-submit cannot create two charges. */
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  /** Where to send the buyer to complete payment. */
  redirectUrl: string;
  providerOrderId: string;
  status: ProviderPaymentStatus;
  raw?: unknown;
}

export interface WebhookVerification {
  ok: boolean;
  reason?: string;
  /** Stable key for idempotent processing of this exact event. */
  dedupeKey: string;
  eventType?: string;
  providerOrderId?: string;
  providerTxnId?: string;
  status: ProviderPaymentStatus;
  amountMinor?: number;
  currency?: string;
  failureCode?: string;
  failureMessage?: string;
  raw: unknown;
}

export interface RefundInput {
  providerTxnId: string;
  amountMinor: number;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  ok: boolean;
  providerRefundId?: string;
  message?: string;
}

export interface ProviderDescriptor {
  id: string;
  /** Shown on the checkout page. */
  labelKa: string;
  labelEn: string;
  descriptionKa: string;
  descriptionEn: string;
  /** Emoji/short mark — real logos are added as assets by the operator. */
  icon: string;
  /** False when credentials are missing, so it is hidden at checkout. */
  configured: boolean;
  /** True for providers settled by hand (bank transfer). */
  manualSettlement: boolean;
}

export interface PaymentProvider {
  readonly id: string;
  descriptor(): ProviderDescriptor;
  createPayment(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  /** Verify + normalise an inbound callback. Must fail closed. */
  verifyWebhook(request: Request, rawBody: string): Promise<WebhookVerification>;
  /** Optional server-side re-check, used to reconcile stuck transactions. */
  fetchStatus?(providerOrderId: string): Promise<ProviderPaymentStatus>;
  refund?(input: RefundInput): Promise<RefundResult>;
}
