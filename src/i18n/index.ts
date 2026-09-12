import { headers, cookies } from "next/headers";
import { isLocale, type Locale } from "@/lib/enums";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER } from "./config";
import { ka, type Dictionary } from "./dictionaries/ka";
import { en } from "./dictionaries/en";

export * from "./config";
export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { ka, en };

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale] ?? ka;

/**
 * Resolve the active locale for a server render.
 * Order: URL prefix (set by middleware) → user cookie → Georgian.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const fromHeader = (await headers()).get(LOCALE_HEADER);
    if (isLocale(fromHeader)) return fromHeader;
  } catch {
    // Outside a request scope.
  }
  try {
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    // No cookie store available.
  }
  return DEFAULT_LOCALE;
}

/** Everything a server component needs: locale, strings and a path helper. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
