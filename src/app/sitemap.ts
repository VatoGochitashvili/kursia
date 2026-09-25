import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { LOCALES, localePath } from "@/i18n/config";

/**
 * Dynamic sitemap.
 *
 * Only genuinely public, indexable URLs appear: the circles that are listed
 * and open, plus the static hubs. There is no course catalogue any more — a
 * lesson lives inside a circle and is not public — and dashboards, checkout,
 * a circle's own rooms and the player are excluded (they are also `noindex`
 * at the header level).
 *
 * Each entry carries hreflang alternates so Google understands the ka/en pair.
 *
 * Rendered PER REQUEST, not at build time. Two reasons, both load-bearing:
 *   1. A build must never need a live database. Prerendering this was what
 *      broke container builds — there is no database at `docker build` time.
 *   2. A sitemap baked at build time is frozen: circles opened after the
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
  const circles = await db.creatorProfile
    .findMany({
      where: {
        communityEnabled: true,
        communityStatus: "APPROVED",
        approvedAt: { not: null },
        user: { status: "ACTIVE" },
      },
      select: { slug: true, updatedAt: true, communityMemberCount: true },
      take: 5_000,
    })
    .catch((error) => {
      console.error("[sitemap] database unavailable, serving static entries only", error);
      return [] as { slug: string; updatedAt: Date; communityMemberCount: number }[];
    });

  const staticPaths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/communities", priority: 0.9, changeFrequency: "daily" },
    { path: "/start", priority: 0.6, changeFrequency: "monthly" },
    { path: "/start/plans", priority: 0.5, changeFrequency: "monthly" },
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

    // A busier circle gets a slightly higher priority — a hint, not a promise.
    ...circles.map((circle) => ({
      url: `${siteUrl}/community/${circle.slug}`,
      lastModified: circle.updatedAt,
      changeFrequency: "weekly" as const,
      priority: circle.communityMemberCount > 50 ? 0.9 : 0.8,
      alternates: withAlternates(`/community/${circle.slug}`),
    })),
  ];
}
