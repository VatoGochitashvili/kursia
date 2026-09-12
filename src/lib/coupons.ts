import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Discount codes.
 *
 * Validation lives here and nowhere else. The checkout needs it to price a
 * purchase and the course page needs it to show the buyer what a code is
 * worth before they commit — if those two answered differently, the price
 * quoted and the price charged would diverge, which is the one bug a
 * discount system must not have.
 */

export type CouponProblem =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "ALREADY_USED"
  | "WRONG_COURSE";

export interface CouponResult {
  ok: boolean;
  problem?: CouponProblem;
  coupon?: { id: string; code: string; discountType: string; discountValue: number };
  /** What comes off, in minor units, already clamped to the price. */
  discountMinor: number;
  /** What is left to pay. */
  finalMinor: number;
}

/** Codes are stored and compared upper-cased, so the buyer may type anything. */
export const normaliseCode = (code: string) => code.trim().toUpperCase();

/**
 * Work out what a code is worth against one course at one price.
 *
 * `priceMinor` is passed in rather than read here, because the caller already
 * knows whether this is a one-time purchase or a month of a subscription, and
 * a percentage has to apply to whichever of those is actually being bought.
 */
export async function evaluateCoupon(input: {
  code: string;
  userId: string;
  courseId: string;
  creatorId: string;
  priceMinor: number;
}): Promise<CouponResult> {
  const miss = (problem: CouponProblem): CouponResult => ({
    ok: false,
    problem,
    discountMinor: 0,
    finalMinor: input.priceMinor,
  });

  const coupon = await db.coupon.findUnique({
    where: { code: normaliseCode(input.code) },
    select: {
      id: true, code: true, creatorId: true, courseId: true,
      discountType: true, discountValue: true,
      maxRedemptions: true, redeemedCount: true,
      startsAt: true, expiresAt: true, isActive: true,
    },
  });

  // A code belonging to another creator is reported as not found rather than
  // as "wrong course": whether a rival's code exists is not this buyer's
  // business, and saying so would turn the endpoint into a code oracle.
  if (!coupon || coupon.creatorId !== input.creatorId) return miss("NOT_FOUND");
  if (!coupon.isActive) return miss("INACTIVE");
  if (coupon.courseId && coupon.courseId !== input.courseId) return miss("WRONG_COURSE");

  const now = Date.now();
  if (coupon.startsAt && coupon.startsAt.getTime() > now) return miss("NOT_STARTED");
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now) return miss("EXPIRED");
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return miss("EXHAUSTED");
  }

  const alreadyUsed = await db.couponRedemption.count({
    where: { couponId: coupon.id, userId: input.userId },
  });
  if (alreadyUsed > 0) return miss("ALREADY_USED");

  const raw =
    coupon.discountType === "PERCENT"
      ? Math.round((input.priceMinor * coupon.discountValue) / 100)
      : coupon.discountValue;

  // Never more than the price. A fixed 50 GEL code on a 30 GEL course makes
  // the course free, not a 20 GEL refund.
  const discountMinor = Math.max(0, Math.min(raw, input.priceMinor));

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountMinor,
    finalMinor: input.priceMinor - discountMinor,
  };
}

/**
 * Record a redemption against a purchase.
 *
 * The counter and the redemption row move together inside the caller's
 * transaction, so they can never disagree about how many times a code has
 * been used.
 *
 * They do not prevent two *different* buyers racing for the last redemption
 * of a limited code — the count is checked when a checkout starts and
 * incremented when it settles, so both can pass the check. See the note at
 * the call site for why that trade is deliberate. The unique pair on
 * (couponId, userId) is absolute, though: one person can never redeem the
 * same code twice, however they race.
 */
export async function recordRedemption(
  tx: Prisma.TransactionClient,
  input: { couponId: string; userId: string; purchaseId: string; amountMinor: number },
) {
  await tx.couponRedemption.create({
    data: {
      couponId: input.couponId,
      userId: input.userId,
      purchaseId: input.purchaseId,
      amountMinor: input.amountMinor,
    },
  });
  await tx.coupon.update({
    where: { id: input.couponId },
    data: { redeemedCount: { increment: 1 } },
  });
}

/** Human-readable reason, for the buyer. */
export const COUPON_MESSAGES: Record<CouponProblem, { ka: string; en: string }> = {
  NOT_FOUND: { ka: "ასეთი კოდი არ არსებობს", en: "No such code" },
  INACTIVE: { ka: "კოდი გამორთულია", en: "This code is switched off" },
  NOT_STARTED: { ka: "კოდი ჯერ არ ამოქმედებულა", en: "This code is not active yet" },
  EXPIRED: { ka: "კოდს ვადა გაუვიდა", en: "This code has expired" },
  EXHAUSTED: { ka: "კოდი ამოიწურა", en: "This code has been fully used" },
  ALREADY_USED: { ka: "ეს კოდი უკვე გამოიყენე", en: "You have already used this code" },
  WRONG_COURSE: { ka: "კოდი ამ კურსზე არ ვრცელდება", en: "This code does not apply to this course" },
};
