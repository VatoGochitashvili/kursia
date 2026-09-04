import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  ProviderDescriptor,
  WebhookVerification,
} from "./types";

/**
 * Bank-transfer provider.
 *
 * Widely expected in Georgia for higher-priced courses and for business
 * buyers who need an invoice. The buyer is shown transfer instructions and the
 * order stays PENDING until an administrator confirms the money arrived, which
 * calls the same `fulfillPurchase()` path as a card payment. There is no
 * automated callback, so `verifyWebhook` always fails closed.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly id = "manual";

  descriptor(): ProviderDescriptor {
    return {
      id: this.id,
      labelKa: "საბანკო გადარიცხვა",
      labelEn: "Bank transfer",
      descriptionKa:
        "მიიღებთ გადარიცხვის ინსტრუქციას. კურსზე წვდომა გაიხსნება თანხის დადასტურების შემდეგ.",
      descriptionEn:
        "You will receive transfer instructions. Access opens once the payment is confirmed.",
      icon: "🏦",
      configured: true,
      manualSettlement: true,
    };
  }

  async createPayment(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      redirectUrl: `/checkout/${input.purchaseReference}/instructions`,
      providerOrderId: `manual_${input.transactionId}`,
      status: "PENDING",
    };
  }

  async verifyWebhook(): Promise<WebhookVerification> {
    // Manual settlement has no machine callback. Anything arriving here is
    // either a misconfiguration or an attempt to self-settle an order.
    return {
      ok: false,
      reason: "manual provider has no webhook; settle via admin confirmation",
      dedupeKey: `manual:rejected:${Date.now()}`,
      status: "UNKNOWN",
      raw: null,
    };
  }
}
