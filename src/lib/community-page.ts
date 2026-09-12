import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership, type Membership } from "@/lib/community";
import { communityLabel, communityScope } from "@/lib/membership";
import type { CommunityView } from "@/components/community/JoinCommunityCard";
import type { Locale } from "@/lib/enums";

/**
 * Everything the feed, the calendar and the leaderboard need about a space.
 *
 * All three pages ask the same three questions — whose community is this, may
 * the viewer in, and what does it cost if not — so they ask them in one place.
 * Three copies would eventually answer differently, and the one that drifted
 * would be the one showing a paywall to somebody who had paid.
 */
export async function loadCommunityPage(
  slug: string,
  viewerId: string | null,
  locale: Locale = "ka",
): Promise<{
  creator: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  };
  membership: Membership;
  community: CommunityView;
  /** True when they have said "do not renew" but the period is still running. */
  cancelled: boolean;
}> {
  const creator = await db.creatorProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      communityEnabled: true,
      communityName: true,
      communityTagline: true,
      communityDescription: true,
      communityPriceMinor: true,
      communityCurrency: true,
      communityMemberCount: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
      _count: { select: { courses: { where: { includedInMembership: true, status: "PUBLISHED" } } } },
    },
  });
  if (!creator) notFound();

  const membership = await getMembership(viewerId, creator.id);

  // Only relevant to somebody already inside, so it is not fetched for the
  // visitors who make up most of the traffic on a public community page.
  let cancelled = false;
  if (viewerId && membership.isSubscriber) {
    const subscription = await db.subscription.findUnique({
      where: { userId_scopeKey: { userId: viewerId, scopeKey: communityScope(creator.id) } },
      select: { status: true },
    });
    cancelled = subscription?.status === "CANCELLED";
  }

  return {
    creator: {
      id: creator.id,
      slug: creator.slug,
      displayName: creator.displayName,
      avatarUrl: creator.user.profile?.avatarUrl ?? null,
    },
    membership,
    community: {
      creatorId: creator.id,
      name: communityLabel(creator, locale),
      tagline: creator.communityTagline,
      description: creator.communityDescription,
      priceMinor: creator.communityPriceMinor,
      currency: creator.communityCurrency,
      memberCount: creator.communityMemberCount,
      enabled: creator.communityEnabled,
      includedCourseCount: creator._count.courses,
    },
    cancelled,
  };
}
