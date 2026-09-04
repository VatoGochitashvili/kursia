import type { MetadataRoute } from "next";
import { isProd } from "@/lib/env";
import { siteUrl } from "@/lib/seo";

/**
 * robots.txt.
 *
 * Private areas are disallowed here AND sent with `X-Robots-Tag: noindex` by
 * middleware — disallow alone only stops crawling, not indexing of a URL
 * someone links to.
 *
 * Non-production deployments block everything, so a staging copy can never
 * outrank or duplicate the live site.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProd) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/learn/",
          "/checkout/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          // Filtered catalogue permutations add nothing to the index.
          "/courses?*",
          "/en/courses?*",
        ],
      },
      // Ad-network crawlers need the same access as search crawlers.
      { userAgent: "AdsBot-Google", allow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
