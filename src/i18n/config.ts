import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/enums";

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };

/**
 * URL strategy
 * ────────────
 * Georgian is the default locale and lives at the ROOT of every path
 * (`/courses/react-safudzvlebi`), which keeps the canonical URLs the Georgian
 * audience and Google see as short as possible. English is served under an
 * `/en` prefix and is marked with hreflang. Middleware rewrites `/en/x` → `/x`
 * and passes the locale down as a request header, so there is exactly one copy
 * of every route file.
 */
export const LOCALE_PREFIX: Record<Locale, string> = { ka: "", en: "/en" };

export const LOCALE_META: Record<Locale, { label: string; htmlLang: string; ogLocale: string; dir: "ltr" }> = {
  ka: { label: "ქართული", htmlLang: "ka-GE", ogLocale: "ka_GE", dir: "ltr" },
  en: { label: "English", htmlLang: "en", ogLocale: "en_US", dir: "ltr" },
};

/** Prefix an app-relative path with the locale segment. */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return `${LOCALE_PREFIX[locale]}${clean === "/" ? "" : clean}` || "/";
}

/** Strip a locale prefix from an incoming pathname. */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const prefix = LOCALE_PREFIX[locale];
    if (pathname === prefix) return { locale, path: "/" };
    if (pathname.startsWith(`${prefix}/`)) return { locale, path: pathname.slice(prefix.length) };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

export const LOCALE_HEADER = "x-kursia-locale";
export const LOCALE_COOKIE = "kursia_locale";
