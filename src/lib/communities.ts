import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { communityLabel } from "@/lib/membership";
import { CATALOGUE_TAG } from "@/lib/courses";
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

  const rows = await db.creatorProfile.findMany({
    where: {
      communityEnabled: true,
      // An unapproved creator is not advertised in the directory.
      approvedAt: { not: null },
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
  const rows = await db.category.findMany({
    where: {
      isActive: true,
      communities: { some: { communityEnabled: true, approvedAt: { not: null } } },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      nameKa: true,
      nameEn: true,
      icon: true,
      _count: {
        select: { communities: { where: { communityEnabled: true, approvedAt: { not: null } } } },
      },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: locale === "en" ? row.nameEn : row.nameKa,
    icon: row.icon,
    count: row._count.communities,
  }));
}
