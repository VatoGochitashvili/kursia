import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { communityLabel } from "@/lib/membership";
import { CATALOGUE_TAG } from "@/lib/courses";
import { payingCreatorFilter } from "@/lib/creator-plan";
import { getSettings } from "@/lib/settings";
import type { Locale } from "@/lib/enums";

export interface CommunityCard {
  creatorId: string;
  slug: string;
  name: string;
  tagline: string | null;
  coverUrl: string | null;
  avatarUrl: string | null;
  creatorName: string;
  isVerified: boolean;
  priceMinor: number;
  currency: string;
  memberCount: number;
  courseCount: number;
  category: { slug: string; name: string } | null;
}

export type CommunitySort = "popular" | "new" | "free";

/**
 * The community directory.
 *
 * Ordered by members first, because on a discovery page the only signal a
 * newcomer can actually read is whether other people are already there. A
 * brand-new empty community sorted above a busy one helps nobody — the "new"
 * tab exists for people who want that instead.
 */
async function query(input: {
  locale: Locale;
  categorySlug?: string;
  sort: CommunitySort;
  search?: string;
  take: number;
}): Promise<CommunityCard[]> {
  const { locale, categorySlug, sort, search, take } = input;
  const settings = await getSettings();

  const rows = await db.creatorProfile.findMany({
    where: {
      communityEnabled: true,
      // Three separate gates, and all three have to hold:
      //   • the creator was approved as a creator at all
      //   • an admin approved THIS circle
      //   • the creator's plan is currently paid
      // Asked as one query rather than filtered afterwards, so paging and
      // counts stay honest.
      approvedAt: { not: null },
      communityStatus: "APPROVED",
      ...payingCreatorFilter(settings.creatorPlanPriceMinor),
      ...(categorySlug ? { communityCategory: { slug: categorySlug } } : {}),
      ...(sort === "free" ? { communityPriceMinor: 0 } : {}),
      ...(search
        ? {
            OR: [
              { communityName: { contains: search } },
              { communityTagline: { contains: search } },
              { displayName: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy:
      sort === "new"
        ? [{ createdAt: "desc" }]
        : [{ communityMemberCount: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      slug: true,
      displayName: true,
      isVerified: true,
      communityName: true,
      communityTagline: true,
      communityCoverUrl: true,
      communityPriceMinor: true,
      communityCurrency: true,
      communityMemberCount: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
      communityCategory: { select: { slug: true, nameKa: true, nameEn: true } },
      _count: {
        select: { courses: { where: { includedInMembership: true, status: "PUBLISHED" } } },
      },
    },
  });

  return rows.map((row) => ({
    creatorId: row.id,
    slug: row.slug,
    name: communityLabel(
      { communityName: row.communityName, displayName: row.displayName },
      locale,
    ),
    tagline: row.communityTagline,
    coverUrl: row.communityCoverUrl,
    avatarUrl: row.user.profile?.avatarUrl ?? null,
    creatorName: row.displayName,
    isVerified: row.isVerified,
    priceMinor: row.communityPriceMinor,
    currency: row.communityCurrency,
    memberCount: row.communityMemberCount,
    courseCount: row._count.courses,
    category: row.communityCategory
      ? {
          slug: row.communityCategory.slug,
          name: locale === "en" ? row.communityCategory.nameEn : row.communityCategory.nameKa,
        }
      : null,
  }));
}

/** Unfiltered directory reads are cached; a search is not worth a cache key. */
export async function listCommunities(input: {
  locale: Locale;
  categorySlug?: string;
  sort?: CommunitySort;
  search?: string;
  take?: number;
}): Promise<CommunityCard[]> {
  const sort = input.sort ?? "popular";
  const take = input.take ?? 48;

  if (input.search) {
    return query({ ...input, sort, take, search: input.search });
  }

  const cached = unstable_cache(
    () => query({ locale: input.locale, categorySlug: input.categorySlug, sort, take }),
    ["communities", input.locale, input.categorySlug ?? "all", sort, String(take)],
    { tags: [CATALOGUE_TAG], revalidate: 300 },
  );
  return cached();
}

/** Categories that actually have a community in them — no empty shelves. */
export async function listCommunityCategories(locale: Locale) {
  const settings = await getSettings();
  const listable = {
    communityEnabled: true,
    approvedAt: { not: null },
    communityStatus: "APPROVED",
    ...payingCreatorFilter(settings.creatorPlanPriceMinor),
  };

  const rows = await db.category.findMany({
    where: { isActive: true, communities: { some: listable } },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      nameKa: true,
      nameEn: true,
      icon: true,
      // The same predicate as the listing, so a category never advertises a
      // count the directory cannot then show.
      _count: { select: { communities: { where: listable } } },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: locale === "en" ? row.nameEn : row.nameKa,
    icon: row.icon,
    count: row._count.communities,
  }));
}

export interface ShowcaseCircle {
  slug: string;
  name: string;
  coverUrl: string | null;
  members: number;
  priceMinor: number;
  currency: string;
  /** Members paying now × the monthly price. Gross, before commission. */
  monthlyMinor: number;
}

/**
 * Circles worth showing to somebody deciding whether to start one.
 *
 * Every figure is arithmetic on live rows — members paying right now times
 * the price they pay — not a number somebody typed. A circle with no paying
 * members is left out rather than shown earning nothing, and so is a free
 * one, where the honest figure would be zero.
 */
export async function listShowcaseCircles(locale: Locale, take = 6): Promise<ShowcaseCircle[]> {
  const settings = await getSettings();
  const now = new Date();

  const rows = await db.creatorProfile.findMany({
    where: {
      communityEnabled: true,
      approvedAt: { not: null },
      communityStatus: "APPROVED",
      communityPriceMinor: { gt: 0 },
      ...payingCreatorFilter(settings.creatorPlanPriceMinor),
    },
    orderBy: { communityMemberCount: "desc" },
    take: take * 3,
    select: {
      slug: true,
      displayName: true,
      communityName: true,
      communityCoverUrl: true,
      communityPriceMinor: true,
      communityCurrency: true,
      _count: {
        select: {
          subscriptions: {
            where: {
              kind: "COMMUNITY",
              status: { in: ["ACTIVE", "CANCELLED"] },
              currentPeriodEnd: { gt: now },
            },
          },
        },
      },
    },
  });

  return rows
    .map((row) => ({
      slug: row.slug,
      name: communityLabel(
        { communityName: row.communityName, displayName: row.displayName },
        locale,
      ),
      coverUrl: row.communityCoverUrl,
      members: row._count.subscriptions,
      priceMinor: row.communityPriceMinor,
      currency: row.communityCurrency,
      monthlyMinor: row._count.subscriptions * row.communityPriceMinor,
    }))
    .filter((row) => row.members > 0)
    .sort((a, b) => b.monthlyMinor - a.monthlyMinor)
    .slice(0, take);
}
