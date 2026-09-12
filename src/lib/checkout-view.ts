import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { communityLabel } from "@/lib/membership";
import type { Locale } from "@/lib/enums";

/**
 * Loads a purchase for the post-payment screens.
 *
 * These pages ALWAYS re-read the authoritative purchase row. A provider's
 * "success" redirect is only a hint about where the browser should land — it
 * is never treated as proof of payment, so a hand-crafted /complete URL shows
 * "processing", not access.
 */
export async function getPurchaseForViewer(
  reference: string,
  userId: string,
  locale: Locale = "ka",
) {
  const purchase = await db.purchase.findUnique({
    where: { reference },
    select: {
      id: true, reference: true, userId: true, status: true,
      amountMinor: true, currency: true, createdAt: true, paidAt: true,
      creatorId: true,
      course: { select: { id: true, slug: true, title: true, thumbnailUrl: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { provider: true, status: true, failureMessage: true },
      },
      enrollment: { select: { id: true, revokedAt: true } },
    },
  });

  // A purchase is only ever visible to the person who made it.
  if (!purchase || purchase.userId !== userId) notFound();

  // What was bought, in one shape.
  //
  // These screens do not care whether the money bought a course or a month of
  // a community — they need a name to print and somewhere to send the buyer.
  // Resolving it here keeps three nearly identical pages from each growing
  // their own branch.
  const creator = purchase.course
    ? null
    : await db.creatorProfile.findUnique({
        where: { id: purchase.creatorId },
        select: { slug: true, displayName: true, communityName: true },
      });

  const subject = purchase.course
    ? {
        kind: "COURSE" as const,
        title: purchase.course.title,
        /** Where to retry a failed payment. */
        retryHref: `/courses/${purchase.course.slug}`,
        /** Where to go once it has been paid for. */
        openHref: `/learn/${purchase.course.slug}`,
      }
    : {
        kind: "COMMUNITY" as const,
        title: communityLabel(creator, locale),
        retryHref: creator ? `/community/${creator.slug}` : "/creators",
        openHref: creator ? `/community/${creator.slug}` : "/dashboard/purchases",
      };

  return { ...purchase, subject };
}

export type PurchaseView = Awaited<ReturnType<typeof getPurchaseForViewer>>;
