import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";

/**
 * Monthly access to a course.
 *
 * Renewal is explicit. Charging a card every month requires storing a
 * tokenised card with the provider, which this platform deliberately does not
 * do, so each period is paid for by its own Purchase and a student who does
 * nothing simply loses access when the period ends. Nobody is charged without
 * choosing to be, and there is no stored card to leak.
 *
 * Access itself is enforced by `Enrollment.accessExpiresAt`, compared inside
 * `hasCourseAccess`. Everything here is bookkeeping around that one field.
 */

/** How long before expiry a student is warned. */
const RENEWAL_NOTICE_DAYS = 3;

/**
 * Add whole months, clamping to the end of the target month.
 *
 * `setMonth` alone rolls over — 31 January plus one month becomes 3 March,
 * which would silently hand a subscriber two or three extra days every time
 * their billing date fell on a long month. Clamping gives 28 February
 * instead, which is what every billing system means by "a month later".
 */
export function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const targetDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const daysInTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(targetDay, daysInTargetMonth));
  return result;
}

/** Is this subscription currently granting access? */
export const isActive = (subscription: { status: string; currentPeriodEnd: Date }): boolean =>
  subscription.status !== "EXPIRED" && subscription.currentPeriodEnd.getTime() > Date.now();

/**
 * Stop a subscription renewing.
 *
 * The paid period is honoured to its end — someone who cancels on day 2 of a
 * month they already paid for keeps the other 28 days. Taking access away at
 * the moment of cancellation would be taking back something already sold.
 */
export async function cancelSubscription(userId: string, subscriptionId: string) {
  const subscription = await db.subscription.findFirst({
    where: { id: subscriptionId, userId },
    select: { id: true, status: true, currentPeriodEnd: true },
  });
  if (!subscription) return null;

  return db.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    select: { id: true, status: true, currentPeriodEnd: true },
  });
}

/**
 * Housekeeping, run from the scheduled job.
 *
 * Two passes: warn people whose access is about to lapse, then close out the
 * ones that already have. Neither is what actually blocks access — that
 * happens the instant `accessExpiresAt` passes — so a late or missed run
 * costs a notification, never a student's content.
 */
export async function runSubscriptionMaintenance(): Promise<{
  warned: number;
  expired: number;
}> {
  const now = new Date();
  const noticeCutoff = new Date(now.getTime() + RENEWAL_NOTICE_DAYS * 86_400_000);

  // ── Ending soon ─────────────────────────────────────────────────────────
  const ending = await db.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { gt: now, lte: noticeCutoff },
      renewalNoticeSentAt: null,
    },
    select: {
      id: true,
      userId: true,
      currentPeriodEnd: true,
      course: { select: { title: true, slug: true } },
    },
    take: 200,
  });

  for (const subscription of ending) {
    await notify({
      userId: subscription.userId,
      type: "SUBSCRIPTION_ENDING",
      title: "წვდომა მალე იწურება",
      body: `„${subscription.course.title}" — განაახლე, რომ არ შეწყდეს.`,
      linkUrl: `/courses/${subscription.course.slug}`,
    }).catch(() => undefined);

    await db.subscription.update({
      where: { id: subscription.id },
      data: { renewalNoticeSentAt: now },
    });
  }

  // ── Already lapsed ──────────────────────────────────────────────────────
  const lapsed = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "CANCELLED"] }, currentPeriodEnd: { lte: now } },
    select: { id: true, userId: true, courseId: true },
    take: 500,
  });

  for (const subscription of lapsed) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "EXPIRED" },
    });
    // The enrolment row stays: it holds the student's progress, and buying
    // another month should return them to where they stopped rather than to
    // the first lesson. Only the expiry matters for access, and it has
    // already passed.
  }

  return { warned: ending.length, expired: lapsed.length };
}
