import type { Metadata } from "next";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { toPlainText } from "@/lib/sanitize";
import { toMajor } from "@/lib/money";
import { LOCALE_META, localePath } from "@/i18n/config";
import { LOCALES, type Locale } from "@/lib/enums";

/**
 * SEO is a first-class concern here: every public page is server-rendered,
 * carries a canonical URL, hreflang alternates for both locales, OpenGraph and
 * Twitter cards, and JSON-LD structured data (Course / Offer / Person /
 * BreadcrumbList / AggregateRating).
 *
 * Structured data is only emitted when it is *true* — an unrated course gets
 * no aggregateRating, because inventing one is a manual-action risk.
 */

export const siteUrl = env.APP_URL.replace(/\/+$/, "");
export const absolute = (path: string) => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

/** Canonical + hreflang for a locale-agnostic path (e.g. "/courses/react"). */
export function alternates(path: string, locale: Locale) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[LOCALE_META[l].htmlLang] = absolute(localePath(path, l));
  languages["x-default"] = absolute(localePath(path, "ka"));
  return { canonical: absolute(localePath(path, locale)), languages };
}

export interface PageSeoInput {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
}

export async function buildMetadata(input: PageSeoInput): Promise<Metadata> {
  const settings = await getSettings();
  const brand = input.locale === "en" ? settings.platformName : settings.platformNameKa;
  const description = toPlainText(input.description, 165);
  const image = input.image ?? absolute("/og-default.svg");

  return {
    title: input.title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: alternates(input.path, input.locale),
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      type: input.type === "profile" ? "profile" : input.type === "article" ? "article" : "website",
      siteName: brand,
      title: input.title,
      description,
      url: absolute(localePath(input.path, input.locale)),
      locale: LOCALE_META[input.locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== input.locale).map((l) => LOCALE_META[l].ogLocale),
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime.toISOString() } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [image],
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>;

export function organizationSchema(settings: { platformName: string; supportEmail: string; logoUrl: string }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: settings.platformName,
    url: siteUrl,
    ...(settings.logoUrl ? { logo: absolute(settings.logoUrl) } : {}),
    email: settings.supportEmail,
    areaServed: { "@type": "Country", name: "Georgia" },
  };
}

export function websiteSchema(name: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: siteUrl,
    inLanguage: ["ka-GE", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/courses?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[], locale: Locale): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(localePath(item.path, locale)),
    })),
  };
}

export interface CourseSchemaInput {
  title: string;
  description: string;
  slug: string;
  locale: Locale;
  language: string;
  level: string;
  thumbnailUrl: string | null;
  priceMinor: number;
  currency: string;
  ratingAvg: number;
  ratingCount: number;
  studentCount: number;
  lessonCount: number;
  durationSeconds: number;
  publishedAt: Date | null;
  updatedAt: Date;
  creator: { displayName: string; slug: string };
  platformName: string;
}

/**
 * Course + Offer schema. Google's Course carousel requires provider and
 * hasCourseInstance; the Offer makes the price eligible for rich results.
 */
export function courseSchema(c: CourseSchemaInput): Json {
  const url = absolute(localePath(`/courses/${c.slug}`, c.locale));
  const isoDuration = `PT${Math.max(Math.round(c.durationSeconds / 60), 1)}M`;

  const schema: Json = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${url}#course`,
    name: c.title,
    description: toPlainText(c.description, 400),
    url,
    inLanguage: c.language === "ka" ? "ka-GE" : c.language,
    ...(c.thumbnailUrl ? { image: absoluteImage(c.thumbnailUrl) } : {}),
    provider: {
      "@type": "Organization",
      name: c.platformName,
      sameAs: siteUrl,
    },
    author: {
      "@type": "Person",
      name: c.creator.displayName,
      url: absolute(localePath(`/creator/${c.creator.slug}`, c.locale)),
    },
    educationalLevel: c.level,
    numberOfCredits: c.lessonCount,
    timeRequired: isoDuration,
    ...(c.publishedAt ? { datePublished: c.publishedAt.toISOString().slice(0, 10) } : {}),
    dateModified: c.updatedAt.toISOString().slice(0, 10),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: isoDuration,
      inLanguage: c.language === "ka" ? "ka-GE" : c.language,
    },
    offers: {
      "@type": "Offer",
      category: c.priceMinor === 0 ? "Free" : "Paid",
      price: toMajor(c.priceMinor, c.currency).toFixed(2),
      priceCurrency: c.currency,
      availability: "https://schema.org/InStock",
      url,
    },
  };

  // Only claim a rating when real reviews exist. Fabricated aggregateRating
  // is a structured-data violation, not a growth hack.
  if (c.ratingCount > 0 && c.ratingAvg > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: c.ratingAvg.toFixed(1),
      ratingCount: c.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

export function reviewSchema(
  reviews: { rating: number; body: string | null; author: string; createdAt: Date }[],
): Json[] {
  return reviews.map((r) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    author: { "@type": "Person", name: r.author },
    datePublished: r.createdAt.toISOString().slice(0, 10),
    ...(r.body ? { reviewBody: toPlainText(r.body, 500) } : {}),
  }));
}

export function personSchema(input: {
  displayName: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  locale: Locale;
  socials: (string | null)[];
  platformName: string;
}): Json {
  const sameAs = input.socials.filter((s): s is string => Boolean(s));
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.displayName,
    url: absolute(localePath(`/creator/${input.slug}`, input.locale)),
    ...(input.bio ? { description: toPlainText(input.bio, 400) } : {}),
    ...(input.avatarUrl ? { image: absoluteImage(input.avatarUrl) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    jobTitle: "Instructor",
    worksFor: { "@type": "Organization", name: input.platformName, url: siteUrl },
  };
}

export function itemListSchema(
  items: { name: string; path: string }[],
  locale: Locale,
  listName: string,
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absolute(localePath(item.path, locale)),
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]): Json | null {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: toPlainText(f.answer, 1000) },
    })),
  };
}

const absoluteImage = (url: string) => (url.startsWith("http") ? url : absolute(url));
