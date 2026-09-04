import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getSettings, resolveCommissionBps } from "@/lib/settings";
import { effectivePriceMinor, formatMoney, splitSale } from "@/lib/money";
import { recordRefund, recordSale } from "@/lib/earnings";
import { notify, absoluteUrl } from "@/lib/notifications";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { ApiError, conflict, notFoundError } from "@/lib/api";
import { getProvider, resolveProviderId } from "./index";
import type { ProviderPaymentStatus } from "./types";

/**
 * THE fulfilment path.
 *
 * Course access exists in exactly one place — the Enrollment table — and this
 * module is the only thing that writes it for a paid course. Everything here
 * runs inside a database transaction and is idempotent, because payment
 * providers retry webhooks and users double-click buttons.
 *
 * Nothing in this file trusts a number sent by a client: prices, commission
 * and totals are all re-read from the database at the moment of purchase.
 */

const reference = () =>
  `KRS-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

// ── Checkout ───────────────────────────────────────────────────────────────

export interface CheckoutResult {
  purchaseId: string;
  reference: string;
  transactionId: string;
  redirectUrl: string;
  provider: string;
  amountMinor: number;
  currency: string;
  /** True when the course was free and access was granted immediately. */
  free: boolean;
}

export async function startCheckout(input: {
  userId: string;
  courseId: string;
  providerId?: string;
  locale: string;
}): Promise<CheckoutResult> {
  const [settings, course, user] = await Promise.all([
    getSettings(),
    db.course.findUnique({
      where: { id: input.courseId },
      select: {
        id: true, slug: true, title: true, status: true, priceMinor: true,
        discountPriceMinor: true, currency: true, creatorId: true,
        creator: { select: { userId: true, displayName: true } },
      },
    }),
    db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, status: true, profile: { select: { fullName: true } } },
    }),
  ]);

  if (!course) throw notFoundError("კურსი ვერ მოიძებნა");
  if (!user || user.status !== "ACTIVE") throw new ApiError(403, "FORBIDDEN", "ანგარიში არააქტიურია");
  if (course.status !== "PUBLISHED") {
    throw new ApiError(409, "NOT_PURCHASABLE", "კურსი ამჟამად არ იყიდება");
  }
  if (course.creator.userId === input.userId) {
    throw conflict("საკუთარი კურსის შეძენა შეუძლებელია");
  }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: course.id } },
    select: { id: true, revokedAt: true },
  });
  if (existing && !existing.revokedAt) throw conflict("კურსი უკვე შეძენილია");

  // Price comes from the database — never from the request body.
  const amountMinor = effectivePriceMinor(course.priceMinor, course.discountPriceMinor);
  const commissionBps = await resolveCommissionBps(course.creatorId);
  const split = splitSale(amountMinor, commissionBps);

  const purchase = await db.purchase.create({
    data: {
      reference: reference(),
      userId: input.userId,
      courseId: course.id,
      creatorId: course.creatorId,
      currency: course.currency,
      listPriceMinor: course.priceMinor,
      amountMinor,
      commissionBps,
      platformFeeMinor: split.platformFeeMinor,
      processingFeeMinor: split.processingFeeMinor,
      creatorEarningsMinor: split.creatorEarningsMinor,
      status: "PENDING",
    },
  });

  // A free course needs no provider round-trip, but still goes through the
  // same fulfilment function so enrolment, ledger and notifications are
  // produced by one code path.
  if (amountMinor === 0) {
    await fulfillPurchase({ purchaseId: purchase.id, source: "FREE" });
    return {
      purchaseId: purchase.id,
      reference: purchase.reference,
      transactionId: "",
      redirectUrl: `/learn/${course.slug}`,
      provider: "free",
      amountMinor: 0,
      currency: course.currency,
      free: true,
    };
  }

  const providerId = await resolveProviderId(input.providerId);
  const provider = getProvider(providerId);

  const transaction = await db.transaction.create({
    data: {
      purchaseId: purchase.id,
      userId: input.userId,
      courseId: course.id,
      provider: providerId,
      status: "CREATED",
      amountMinor,
      currency: course.currency,
      idempotencyKey: `${purchase.id}:${providerId}`,
    },
  });

  try {
    const intent = await provider.createPayment({
      transactionId: transaction.id,
      purchaseReference: purchase.reference,
      amountMinor,
      currency: course.currency,
      description: course.title,
      buyer: { id: user.id, email: user.email, name: user.profile?.fullName ?? user.email },
      course: { id: course.id, title: course.title, slug: course.slug },
      locale: input.locale,
      returnUrl: absoluteUrl(`/checkout/${purchase.reference}/complete`),
      cancelUrl: absoluteUrl(`/checkout/${purchase.reference}/cancelled`),
      callbackUrl: absoluteUrl(`/api/webhooks/payments/${providerId}`),
      idempotencyKey: transaction.id,
    });

    await db.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "PENDING",
        providerOrderId: intent.providerOrderId,
        rawResponse: JSON.stringify(intent.raw ?? {}).slice(0, 10_000),
      },
    });

    return {
      purchaseId: purchase.id,
      reference: purchase.reference,
      transactionId: transaction.id,
      redirectUrl: intent.redirectUrl,
      provider: providerId,
      amountMinor,
      currency: course.currency,
      free: false,
    };
  } catch (error) {
    await db.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        failureCode: "PROVIDER_ERROR",
        failureMessage: (error as Error).message.slice(0, 500),
      },
    });
    await db.purchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
    throw new ApiError(
      502,
      "PROVIDER_ERROR",
      "გადახდის სისტემასთან დაკავშირება ვერ მოხერხდა. სცადეთ სხვა მეთოდი.",
    );
  }
}

// ── Settlement ─────────────────────────────────────────────────────────────

export interface FulfillInput {
  purchaseId: string;
  transactionId?: string;
  source?: "PURCHASE" | "FREE" | "ADMIN_GRANT";
  actorId?: string;
}

/**
 * Grant access. Idempotent — a repeated webhook is a no-op.
 * Returns whether this call was the one that actually settled the purchase.
 */
export async function fulfillPurchase(input: FulfillInput): Promise<{ settled: boolean }> {
  const settings = await getSettings();

  const result = await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: input.purchaseId },
      select: {
        id: true, userId: true, courseId: true, creatorId: true, status: true,
        currency: true, amountMinor: true, platformFeeMinor: true,
        processingFeeMinor: true, creatorEarningsMinor: true, reference: true,
        course: { select: { title: true, slug: true, creator: { select: { userId: true } } } },
      },
    });
    if (!purchase) throw notFoundError("შენაძენი ვერ მოიძებნა");

    // Already settled — a duplicate webhook. Nothing to do.
    if (purchase.status === "PAID") return { settled: false, purchase };
    if (purchase.status === "REFUNDED") {
      throw conflict("დაბრუნებული შენაძენის დადასტურება შეუძლებელია");
    }

    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (input.transactionId) {
      await tx.transaction.update({
        where: { id: input.transactionId },
        data: { status: "SUCCEEDED" },
      });
    }

    // Enrolment: create, or un-revoke a previously refunded one.
    await tx.enrollment.upsert({
      where: { userId_courseId: { userId: purchase.userId, courseId: purchase.courseId } },
      create: {
        userId: purchase.userId,
        courseId: purchase.courseId,
        source: input.source ?? "PURCHASE",
        purchaseId: purchase.id,
      },
      update: { revokedAt: null, purchaseId: purchase.id },
    });

    await tx.course.update({
      where: { id: purchase.courseId },
      data: { studentCount: { increment: 1 } },
    });

    if (purchase.creatorEarningsMinor > 0) {
      await recordSale(tx, {
        creatorId: purchase.creatorId,
        purchaseId: purchase.id,
        currency: purchase.currency,
        amountMinor: purchase.amountMinor,
        platformFeeMinor: purchase.platformFeeMinor,
        processingFeeMinor: purchase.processingFeeMinor,
        creatorEarningsMinor: purchase.creatorEarningsMinor,
        clearingDays: settings.payoutClearingDays,
        courseTitle: purchase.course.title,
      });
    }

    return { settled: true, purchase };
  });

  if (!result.settled) return { settled: false };

  const p = result.purchase;

  // Side effects happen after the transaction commits, so a slow email or a
  // notification failure can never roll back a paid enrolment.
  await audit({
    actorId: input.actorId ?? p.userId,
    action: AUDIT_ACTIONS.PURCHASE_PAID,
    targetType: "Purchase",
    targetId: p.id,
    summary: `${p.reference} — ${p.course.title}`,
    metadata: { amountMinor: p.amountMinor, currency: p.currency },
  });

  const amount = formatMoney(p.amountMinor, p.currency, { freeLabel: "უფასო" });

  await notify({
    userId: p.userId,
    type: "COURSE_PURCHASED",
    title: "კურსი წარმატებით შეიძინეთ",
    body: p.course.title,
    linkUrl: `/learn/${p.course.slug}`,
    data: { courseId: p.courseId, purchaseId: p.id },
    email: {
      template: "purchaseReceipt",
      payload: {
        courseTitle: p.course.title,
        amount,
        reference: p.reference,
        url: absoluteUrl(`/learn/${p.course.slug}`),
      },
    },
  });

  await notify({
    userId: p.course.creator.userId,
    type: "COURSE_SOLD",
    title: "ახალი გაყიდვა",
    body: `${p.course.title} — ${amount}`,
    linkUrl: "/dashboard/creator/sales",
    data: { courseId: p.courseId, purchaseId: p.id },
    email: {
      template: "courseSold",
      payload: {
        courseTitle: p.course.title,
        amount,
        earnings: formatMoney(p.creatorEarningsMinor, p.currency),
        url: absoluteUrl("/dashboard/creator"),
      },
    },
  });

  return { settled: true };
}

/** Mark a purchase failed/cancelled. Never touches enrolment. */
export async function failPurchase(input: {
  purchaseId: string;
  transactionId?: string;
  status: "FAILED" | "CANCELLED";
  code?: string;
  message?: string;
}): Promise<void> {
  const purchase = await db.purchase.findUnique({
    where: { id: input.purchaseId },
    select: { id: true, status: true, userId: true, course: { select: { title: true } } },
  });
  if (!purchase || purchase.status === "PAID") return; // never downgrade a paid order

  await db.purchase.update({
    where: { id: purchase.id },
    data: {
      status: input.status,
      cancelledAt: input.status === "CANCELLED" ? new Date() : null,
    },
  });

  if (input.transactionId) {
    await db.transaction.update({
      where: { id: input.transactionId },
      data: {
        status: input.status,
        failureCode: input.code ?? null,
        failureMessage: input.message?.slice(0, 500) ?? null,
      },
    });
  }

  if (input.status === "FAILED") {
    await notify({
      userId: purchase.userId,
      type: "PAYMENT_FAILED",
      title: "გადახდა ვერ შესრულდა",
      body: purchase.course.title,
      linkUrl: "/dashboard/purchases",
    });
  }
}

/**
 * Process a refund: reverse the ledger, optionally revoke access, and record
 * the outcome. `revokeAccess` is configurable because a goodwill partial
 * refund should not always remove the course.
 */
export async function processRefund(input: {
  refundId: string;
  actorId: string;
}): Promise<void> {
  const refund = await db.refund.findUnique({
    where: { id: input.refundId },
    select: {
      id: true, purchaseId: true, amountMinor: true, currency: true, status: true,
      revokeAccess: true,
      purchase: {
        select: {
          id: true, userId: true, courseId: true, creatorId: true, amountMinor: true,
          creatorEarningsMinor: true, refundedAmountMinor: true, reference: true,
          course: { select: { title: true, slug: true } },
        },
      },
    },
  });
  if (!refund) throw notFoundError("დაბრუნება ვერ მოიძებნა");
  if (refund.status === "PROCESSED") return; // idempotent

  const p = refund.purchase;
  const alreadyRefunded = p.refundedAmountMinor;
  const newRefundedTotal = Math.min(alreadyRefunded + refund.amountMinor, p.amountMinor);
  const fullyRefunded = newRefundedTotal >= p.amountMinor;

  // The creator gives back the same proportion of the sale they earned.
  const proportion = p.amountMinor > 0 ? refund.amountMinor / p.amountMinor : 0;
  const creatorShare = Math.round(p.creatorEarningsMinor * proportion);

  await db.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refund.id },
      data: { status: "PROCESSED", processedAt: new Date(), handledById: input.actorId },
    });

    await tx.purchase.update({
      where: { id: p.id },
      data: {
        status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundedAmountMinor: newRefundedTotal,
        refundedAt: new Date(),
      },
    });

    if (refund.revokeAccess) {
      await tx.enrollment.updateMany({
        where: { userId: p.userId, courseId: p.courseId },
        data: { revokedAt: new Date() },
      });
      await tx.course.update({
        where: { id: p.courseId },
        data: { studentCount: { decrement: 1 } },
      });
    }

    if (creatorShare > 0) {
      await recordRefund(tx, {
        creatorId: p.creatorId,
        purchaseId: p.id,
        currency: refund.currency,
        refundAmountMinor: refund.amountMinor,
        creatorShareMinor: creatorShare,
        courseTitle: p.course.title,
      });
    }
  });

  await audit({
    actorId: input.actorId,
    action: AUDIT_ACTIONS.REFUND_PROCESSED,
    targetType: "Refund",
    targetId: refund.id,
    summary: `${p.reference} — ${formatMoney(refund.amountMinor, refund.currency)}`,
    metadata: { revokedAccess: refund.revokeAccess, fullyRefunded },
  });

  await notify({
    userId: p.userId,
    type: "REFUND_PROCESSED",
    title: "თანხა დაბრუნდა",
    body: `${p.course.title} — ${formatMoney(refund.amountMinor, refund.currency)}`,
    linkUrl: "/dashboard/purchases",
  });
}

/** Map a provider status onto the right settlement action. */
export async function applyProviderStatus(input: {
  purchaseId: string;
  transactionId: string;
  status: ProviderPaymentStatus;
  failureCode?: string;
  failureMessage?: string;
}): Promise<void> {
  switch (input.status) {
    case "SUCCEEDED":
      await fulfillPurchase({
        purchaseId: input.purchaseId,
        transactionId: input.transactionId,
        source: "PURCHASE",
      });
      return;
    case "FAILED":
      await failPurchase({ ...input, status: "FAILED" });
      return;
    case "CANCELLED":
      await failPurchase({ ...input, status: "CANCELLED" });
      return;
    case "REFUNDED":
    case "PENDING":
    case "UNKNOWN":
    default:
      // Nothing to do. A refund is driven by the admin flow, and PENDING /
      // UNKNOWN must never change entitlement.
      return;
  }
}
