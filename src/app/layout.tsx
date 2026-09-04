import type { Metadata, Viewport } from "next";
import { Noto_Sans_Georgian, Inter } from "next/font/google";
import { getLocale, LOCALE_META } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { organizationSchema, siteUrl, websiteSchema } from "@/lib/seo";
import { JsonLd } from "@/components/ui/primitives";
import "./globals.css";

/**
 * Root document. Deliberately thin — the marketing chrome lives in the (site)
 * group, the dashboards in (app), and the learning player has its own layout,
 * so each area ships only the shell it needs.
 */

/**
 * Fonts are self-hosted through next/font: the files are served from our own
 * origin (no third-party round-trip), `display: swap` avoids invisible text,
 * and the CSS variables are emitted at build time — which also means the
 * layout renders no manual <head>, the source of hydration mismatches in the
 * App Router.
 */
const georgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-georgian",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-latin",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${brand} — ${locale === "en" ? settings.taglineEn : settings.seoDefaultTitleKa}`,
      // Every page title gets the brand appended, so SERP entries are
      // self-identifying without each page repeating the name.
      template: `%s · ${brand}`,
    },
    description: settings.seoDefaultDescriptionKa,
    applicationName: brand,
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { telephone: false },
    icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, settings] = await Promise.all([getLocale(), getSettings()]);
  const meta = LOCALE_META[locale];
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  return (
    <html
      lang={meta.htmlLang}
      dir={meta.dir}
      className={`${georgian.variable} ${inter.variable}`}
    >
      <body className="min-h-dvh bg-surface">
        {/* Keyboard users land here first. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {locale === "en" ? "Skip to content" : "მთავარ შინაარსზე გადასვლა"}
        </a>
        {children}
        <JsonLd
          data={[
            organizationSchema({
              platformName: brand,
              supportEmail: settings.supportEmail,
              logoUrl: settings.logoUrl,
            }),
            websiteSchema(brand),
          ]}
        />
      </body>
    </html>
  );
}
