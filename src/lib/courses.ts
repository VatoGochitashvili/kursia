import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { transliterateGeorgian } from "@/lib/slug";

/**
 * Course discovery: search, filter, sort, paginate.
 *
 * Georgian text search
 * ────────────────────
 * Georgian is a unicameral script — it has no upper/lower case — so a plain
 * `contains` match is already case-insensitive for Georgian, which is why this
 * works identically on SQLite and PostgreSQL (Prisma's `mode: "insensitive"`
 * is Postgres-only). For Latin input we additionally try lower/upper/title
 * variants, and we transliterate Georgian queries so someone typing
 * "marketingi" still finds "მარკეტინგი"-titled courses via their slug.
 *
 * When the catalogue outgrows this (roughly 10⁵ courses), the seam to replace
 * is `buildSearchFilter` — point it at Postgres full-text search with a
 * Georgian-aware configuration, or Meilisearch/Typesense.
 */

export const COURSE_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  thumbnailUrl: true,
  priceMinor: true,
  discountPriceMinor: true,
  currency: true,
  level: true,
  language: true,
  ratingAvg: true,
  ratingCount: true,
  studentCount: true,
  lessonCount: true,
  durationSeconds: true,
  publishedAt: true,
  isFeatured: true,
  creator: { select: { slug: true, displayName: true, isVerified: true, user: { select: { profile: { select: { avatarUrl: true } } } } } },
  category: { select: { slug: true, nameKa: true, nameEn: true } },
} satisfies Prisma.CourseSelect;

export type CourseCard = Prisma.CourseGetPayload<{ select: typeof COURSE_CARD_SELECT }>;

export interface CourseSearchParams {
  q?: string;
  category?: string;
  level?: string;
  language?: string;
  price?: "all" | "free" | "paid";
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: "relevance" | "popular" | "newest" | "rating" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
}

/** Only PUBLISHED courses are ever visible to the marketplace. */
const publicWhere: Prisma.CourseWhereInput = { status: "PUBLISHED" };

function caseVariants(term: string): string[] {
  const variants = new Set<string>([term]);
  variants.add(term.toLowerCase());
  variants.add(term.toUpperCase());
  variants.add(term.charAt(0).toUpperCase() + term.slice(1).toLowerCase());
  const latin = transliterateGeorgian(term).toLowerCase();
  if (latin !== term.toLowerCase()) variants.add(latin);
  return [...variants].filter((v) => v.length > 0);
}

function buildSearchFilter(query: string): Prisma.CourseWhereInput | null {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (terms.length === 0) return null;

  // Every term must match somewhere (AND of ORs) — narrows results as the
  // searcher adds words, which is what people expect.
  return {
    AND: terms.map((term) => ({
      OR: caseVariants(term).flatMap((v) => [
        { title: { contains: v } },
        { subtitle: { contains: v } },
        { description: { contains: v } },
        { slug: { contains: v } },
        { creator: { displayName: { contains: v } } },
        { category: { is: { nameKa: { contains: v } } } },
        { category: { is: { nameEn: { contains: v } } } },
      ]),
    })),
  };
}

export function buildCourseWhere(params: CourseSearchParams): Prisma.CourseWhereInput {
  const and: Prisma.CourseWhereInput[] = [publicWhere];

  if (params.q) {
    const search = buildSearchFilter(params.q);
    if (search) and.push(search);
  }

  if (params.category) {
    // Match the category or any of its subcategories.
    and.push({
      OR: [
        { category: { is: { slug: params.category } } },
        { subcategory: { is: { slug: params.category } } },
        { category: { is: { parent: { is: { slug: params.category } } } } },
      ],
    });
  }

  if (params.level && params.level !== "all") and.push({ level: params.level });
  if (params.language && params.language !== "all") and.push({ language: params.language });

  if (params.price === "free") and.push({ priceMinor: 0 });
  if (params.price === "paid") and.push({ priceMinor: { gt: 0 } });

  if (params.minPrice !== undefined) {
    and.push({ priceMinor: { gte: Math.round(params.minPrice * 100) } });
  }
  if (params.maxPrice !== undefined) {
    and.push({ priceMinor: { lte: Math.round(params.maxPrice * 100) } });
  }
  if (params.rating !== undefined && params.rating > 0) {
    and.push({ ratingAvg: { gte: params.rating } });
  }

  return { AND: and };
}

function buildOrderBy(
  sort: CourseSearchParams["sort"],
  hasQuery: boolean,
): Prisma.CourseOrderByWithRelationInput[] {
  switch (sort) {
    case "popular":
      return [{ studentCount: "desc" }, { ratingAvg: "desc" }];
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "price_asc":
      return [{ priceMinor: "asc" }];
    case "price_desc":
      return [{ priceMinor: "desc" }];
    default:
      // "Relevance" without a query is meaningless, so fall back to a blend of
      // curation and popularity that keeps a fresh catalogue from looking dead.
      return hasQuery
        ? [{ studentCount: "desc" }, { ratingAvg: "desc" }, { publishedAt: "desc" }]
        : [{ isFeatured: "desc" }, { studentCount: "desc" }, { publishedAt: "desc" }];
  }
}

export interface CourseSearchResult {
  courses: CourseCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function searchCourses(params: CourseSearchParams): Promise<CourseSearchResult> {
  const page = Math.max(params.page ?? 1, 1);
  const perPage = Math.min(Math.max(params.perPage ?? 12, 1), 48);
  const where = buildCourseWhere(params);

  const [total, courses] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      select: COURSE_CARD_SELECT,
      orderBy: buildOrderBy(params.sort, Boolean(params.q)),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return { courses, total, page, perPage, totalPages: Math.max(Math.ceil(total / perPage), 1) };
}

// ── Homepage / carousel queries ────────────────────────────────────────────

export async function getFeaturedCourses(limit = 8, explicitIds: string[] = []) {
  if (explicitIds.length > 0) {
    const curated = await db.course.findMany({
      where: { AND: [publicWhere, { id: { in: explicitIds } }] },
      select: COURSE_CARD_SELECT,
      take: limit,
    });
    // Preserve the admin's chosen order.
    const byId = new Map(curated.map((c) => [c.id, c]));
    const ordered = explicitIds.map((id) => byId.get(id)).filter((c): c is CourseCard => Boolean(c));
    if (ordered.length >= limit) return ordered.slice(0, limit);
    const filler = await db.course.findMany({
      where: { AND: [publicWhere, { isFeatured: true }, { id: { notIn: explicitIds } }] },
      select: COURSE_CARD_SELECT,
      orderBy: [{ featuredRank: "asc" }, { studentCount: "desc" }],
      take: limit - ordered.length,
    });
    return [...ordered, ...filler];
  }

  const featured = await db.course.findMany({
    where: { AND: [publicWhere, { isFeatured: true }] },
    select: COURSE_CARD_SELECT,
    orderBy: [{ featuredRank: "asc" }, { studentCount: "desc" }],
    take: limit,
  });
  if (featured.length >= limit) return featured;

  // A brand-new marketplace has nothing featured yet — never show an empty
  // shelf on the homepage.
  const filler = await db.course.findMany({
    where: { AND: [publicWhere, { id: { notIn: featured.map((c) => c.id) } }] },
    select: COURSE_CARD_SELECT,
    orderBy: [{ ratingAvg: "desc" }, { studentCount: "desc" }],
    take: limit - featured.length,
  });
  return [...featured, ...filler];
}

export const getPopularCourses = (limit = 8) =>
  db.course.findMany({
    where: publicWhere,
    select: COURSE_CARD_SELECT,
    orderBy: [{ studentCount: "desc" }, { ratingAvg: "desc" }],
    take: limit,
  });

export const getNewCourses = (limit = 8) =>
  db.course.findMany({
    where: publicWhere,
    select: COURSE_CARD_SELECT,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

export async function getPopularCreators(limit = 6, explicitIds: string[] = []) {
  const where: Prisma.CreatorProfileWhereInput =
    explicitIds.length > 0
      ? { id: { in: explicitIds } }
      : { courses: { some: { status: "PUBLISHED" } } };

  const creators = await db.creatorProfile.findMany({
    where,
    select: {
      id: true,
      slug: true,
      displayName: true,
      instructorBio: true,
      isVerified: true,
      user: { select: { profile: { select: { avatarUrl: true, headline: true } } } },
      courses: {
        where: { status: "PUBLISHED" },
        select: { studentCount: true, ratingAvg: true, ratingCount: true },
      },
    },
    take: limit * 3,
  });

  return creators
    .map((c) => {
      const students = c.courses.reduce((s, x) => s + x.studentCount, 0);
      const ratingCount = c.courses.reduce((s, x) => s + x.ratingCount, 0);
      const weighted = c.courses.reduce((s, x) => s + x.ratingAvg * x.ratingCount, 0);
      return {
        id: c.id,
        slug: c.slug,
        displayName: c.displayName,
        headline: c.user.profile?.headline ?? null,
        bio: c.instructorBio,
        avatarUrl: c.user.profile?.avatarUrl ?? null,
        isVerified: c.isVerified,
        courseCount: c.courses.length,
        studentCount: students,
        ratingCount,
        ratingAvg: ratingCount > 0 ? Math.round((weighted / ratingCount) * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.studentCount - a.studentCount || b.ratingAvg - a.ratingAvg)
    .slice(0, limit);
}

export type CreatorCard = Awaited<ReturnType<typeof getPopularCreators>>[number];

/** Category tree with published-course counts, for nav and the homepage. */
export async function getCategoryTree() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: {
      id: true, slug: true, nameKa: true, nameEn: true, icon: true,
      colorHex: true, parentId: true, sortOrder: true,
      _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
    },
    orderBy: [{ sortOrder: "asc" }, { nameKa: "asc" }],
  });

  const roots = categories.filter((c) => !c.parentId);
  return roots.map((root) => {
    const children = categories.filter((c) => c.parentId === root.id);
    return {
      ...root,
      courseCount: root._count.courses + children.reduce((s, c) => s + c._count.courses, 0),
      children: children.map((c) => ({ ...c, courseCount: c._count.courses })),
    };
  });
}

export type CategoryNode = Awaited<ReturnType<typeof getCategoryTree>>[number];

/** Headline platform numbers for the homepage. */
export async function getPlatformStats() {
  const [courses, students, creators, ratingAgg] = await Promise.all([
    db.course.count({ where: publicWhere }),
    db.enrollment.count({ where: { revokedAt: null } }),
    db.creatorProfile.count({ where: { courses: { some: { status: "PUBLISHED" } } } }),
    db.course.aggregate({
      where: { AND: [publicWhere, { ratingCount: { gt: 0 } }] },
      _avg: { ratingAvg: true },
    }),
  ]);
  return {
    courses,
    students,
    creators,
    averageRating: Math.round((ratingAgg._avg.ratingAvg ?? 0) * 10) / 10,
  };
}
