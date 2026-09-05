import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { LOCALES, localePath } from "@/i18n/config";

/**
 * Dynamic sitemap.
 *
 * Only genuinely public, indexable URLs appear: published courses, active
 * categories, creators with at least one published course, plus the static
 * hubs. Dashboards, checkout and the learning player are excluded (they are
 * also `noindex` at the header level).
 *
 * Each entry carries hreflang alternates so Google understands the ka/en pair.
 *
 * Rendered PER REQUEST, not at build time. Two reasons, both load-bearing:
 *   1. A build must never need a live database. Prerendering this was what
 *      broke container builds — there is no database at `docker build` time.
 *   2. A sitemap baked at build time is frozen: courses published after the
 *      deploy would not appear until the next one. Crawlers fetch this a few
 *      times a day, so one query per fetch costs nothing and is always current.
 */
export const dynamic = "force-dynamic";

function withAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale === "ka" ? "ka-GE" : "en"] = `${siteUrl}${localePath(path, locale)}`;
  }
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A database blip should degrade the sitemap to its static pages, never
  // return a 500 to Googlebot.
  const [courses, categories, creators] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, studentCount: true },
      orderBy: { publishedAt: "desc" },
      take: 20_000,
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.creatorProfile.findMany({
      where: { courses: { some: { status: "PUBLISHED" } }, user: { status: "ACTIVE" } },
      select: { slug: true, updatedAt: true },
      take: 5_000,
    }),
  ]).catch((error) => {
    console.error("[sitemap] database unavailable, serving static entries only", error);
    return [[], [], []] as [
      { slug: string; updatedAt: Date; studentCount: number }[],
      { slug: string; updatedAt: Date }[],
      { slug: string; updatedAt: Date }[],
    ];
  });

  const staticPaths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/courses", priority: 0.9, changeFrequency: "daily" },
    { path: "/categories", priority: 0.7, changeFrequency: "weekly" },
    { path: "/instructors", priority: 0.7, changeFrequency: "weekly" },
    { path: "/become-instructor", priority: 0.6, changeFrequency: "monthly" },
    { path: "/certificate", priority: 0.4, changeFrequency: "yearly" },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
  ];

  const now = new Date();

  return [
    ...staticPaths.map((entry) => ({
      url: `${siteUrl}${entry.path === "/" ? "" : entry.path}`,
      lastModified: now,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: withAlternates(entry.path),
    })),

    // Popular courses get a slightly higher priority — a hint, not a promise.
    ...courses.map((course) => ({
      url: `${siteUrl}/courses/${course.slug}`,
      lastModified: course.updatedAt,
      changeFrequency: "weekly" as const,
      priority: course.studentCount > 50 ? 0.9 : 0.8,
      alternates: withAlternates(`/courses/${course.slug}`),
    })),

    ...categories.map((category) => ({
      url: `${siteUrl}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: withAlternates(`/category/${category.slug}`),
    })),

    ...creators.map((creator) => ({
      url: `${siteUrl}/creator/${creator.slug}`,
      lastModified: creator.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: withAlternates(`/creator/${creator.slug}`),
    })),
  ];
}
