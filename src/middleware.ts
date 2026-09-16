import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER, PATHNAME_HEADER, stripLocale } from "@/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/enums";

/**
 * Middleware does exactly two cheap things — it runs on the Edge runtime, so
 * it deliberately performs NO database or crypto work. Authorization happens
 * in server components and route handlers, where the session can actually be
 * validated against the database.
 *
 *  1. Locale routing: `/en/courses` is rewritten to `/courses` with the locale
 *     passed down as a request header, so there is one copy of each route file
 *     and Georgian keeps clean, prefix-free canonical URLs.
 *  2. Passes the locale-stripped pathname down as a header.
 *  3. Marks dashboard/admin paths as non-indexable at the edge.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, path } = stripLocale(pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  // The locale-stripped path, passed down so a layout can tell which of its
  // own pages is being rendered. A layout has no other way to know, and the
  // creator studio needs it: the studio is locked without a plan, but the page
  // where you buy that plan lives inside the studio and must stay reachable.
  requestHeaders.set(PATHNAME_HEADER, path);

  const response =
    locale === DEFAULT_LOCALE
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(new URL(`${path}${search}`, request.url), {
          request: { headers: requestHeaders },
        });

  // Remember an explicit language choice for subsequent visits.
  if (locale !== DEFAULT_LOCALE && request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Private areas must never be indexed, even if a URL leaks.
  if (/^\/(dashboard|admin|checkout|learn)(\/|$)/.test(path)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, the API, and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
