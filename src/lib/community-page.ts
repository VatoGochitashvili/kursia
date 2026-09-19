import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership, type Membership } from "@/lib/community";
import { communityLabel, communityScope } from "@/lib/membership";
import { getJoinGate, type JoinGate } from "@/lib/join-requests";
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
async function load(
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
  /** Whether this circle reviews applicants, and where this viewer stands. */
  gate: JoinGate;
  /** The people who run the room, named in the sidebar. */
  admins: { userId: string; name: string }[];
  /** Applications waiting on a decision. Only asked for someone who can decide. */
  pendingRequests: number;
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
      communityCoverUrl: true,
      communityPriceMinor: true,
      communityCurrency: true,
      communityMemberCount: true,
      communityRequiresApproval: true,
      communityCategory: { select: { slug: true, nameKa: true, nameEn: true } },
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

  // Only asked for people who are not already inside — a member has nothing
  // left to apply for.
  const gate = membership.isMember
    ? { required: false, status: "APPROVED" as const, cleared: true, reviewNote: null }
    : await getJoinGate(creator.id, viewerId, creator.communityRequiresApproval);

  const adminRows = await db.communityRole.findMany({
    where: { creatorId: creator.id, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      user: { select: { profile: { select: { fullName: true } } } },
    },
  });
  const admins = adminRows.map((row) => ({
    userId: row.userId,
    name: row.user.profile?.fullName ?? "—",
  }));

  const pendingRequests = membership.canModerate
    ? await db.communityJoinRequest.count({ where: { creatorId: creator.id, status: "PENDING" } })
    : 0;

  return {
    gate,
    admins,
    pendingRequests,
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
      coverUrl: creator.communityCoverUrl,
      priceMinor: creator.communityPriceMinor,
      currency: creator.communityCurrency,
      memberCount: creator.communityMemberCount,
      enabled: creator.communityEnabled,
      includedCourseCount: creator._count.courses,
      category: creator.communityCategory
        ? {
            slug: creator.communityCategory.slug,
            name:
              locale === "en"
                ? creator.communityCategory.nameEn
                : creator.communityCategory.nameKa,
          }
        : null,
    },
    cancelled,
  };
}

/**
 * Cached for the length of one request. The circle's layout and the page
 * inside it both need this, and without the cache every circle page would ask
 * the database the same questions twice.
 */
export const loadCommunityPage = cache(load);
