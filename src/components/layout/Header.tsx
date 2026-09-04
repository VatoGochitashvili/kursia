import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getCategoryTree } from "@/lib/courses";
import { getI18n, localePath } from "@/i18n";
import { categoryIcon } from "@/components/ui/Icon";
import { SearchBar } from "./SearchBar";
import { HeaderClient, type HeaderUser, type NavCategory } from "./HeaderClient";
import { Logo } from "./Logo";

/**
 * Server-rendered header: the brand, primary links and the search form arrive
 * in the HTML, so navigation is crawlable and usable before hydration.
 */
export async function Header() {
  const [{ locale, t }, settings, sessionUser, categories] = await Promise.all([
    getI18n(),
    getSettings(),
    getSessionUser(),
    getCategoryTree(),
  ]);

  const unread = sessionUser
    ? await db.notification.count({ where: { userId: sessionUser.id, readAt: null } })
    : 0;

  const user: HeaderUser | null = sessionUser
    ? {
        fullName: sessionUser.fullName,
        email: sessionUser.email,
        avatarUrl: sessionUser.avatarUrl,
        role: sessionUser.role,
        unreadNotifications: unread,
      }
    : null;

  const navCategories: NavCategory[] = categories.slice(0, 10).map((c) => ({
    slug: c.slug,
    name: locale === "en" ? c.nameEn : c.nameKa,
    icon: categoryIcon(c.icon),
    courseCount: c.courseCount,
    children: c.children.map((child) => ({
      slug: child.slug,
      name: locale === "en" ? child.nameEn : child.nameKa,
    })),
  }));

  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;
  const otherLocale = locale === "ka" ? "en" : "ka";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3">
        <Link
          href={localePath("/", locale)}
          className="flex shrink-0 items-center gap-2 rounded-lg pr-2"
          aria-label={brand}
        >
          <Logo />
          <span className="hidden text-[17px] font-bold tracking-tight text-ink sm:block">
            {brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label={t.nav.courses}>
          <Link
            href={localePath("/courses", locale)}
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            {t.nav.courses}
          </Link>
          <Link
            href={localePath("/instructors", locale)}
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            {t.nav.creators}
          </Link>
        </nav>

        <div className="mx-auto hidden w-full max-w-md md:block">
          <SearchBar placeholder={t.home.heroSearchPlaceholder} action={localePath("/courses", locale)} />
        </div>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          {!user && (
            <Link
              href={localePath("/become-instructor", locale)}
              className="hidden h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink xl:inline-flex"
            >
              {t.nav.becomeCreator}
            </Link>
          )}
          <HeaderClient
            user={user}
            categories={navCategories}
            localeSwitch={{
              href: localePath("/", otherLocale),
              label: otherLocale === "en" ? "English" : "ქართული",
            }}
            labels={{
              categories: t.nav.categories,
              coursesShort: t.nav.courses,
              courses: t.nav.courses,
              notifications: t.nav.notifications,
              profile: t.nav.profile,
              dashboard: t.nav.dashboard,
              myLearning: t.nav.myLearning,
              creatorStudio: t.nav.creatorStudio,
              admin: t.nav.admin,
              wishlist: t.nav.wishlist,
              certificates: t.nav.certificates,
              settings: t.nav.settings,
              logout: t.nav.logout,
              login: t.nav.login,
              register: t.nav.register,
              becomeCreator: t.nav.becomeCreator,
              menu: t.nav.menu,
              close: t.common.close,
            }}
          />
        </div>
      </div>

      {/* Mobile search sits below the bar so the header stays uncluttered. */}
      <div className="border-t border-line px-4 py-2 md:hidden">
        <SearchBar placeholder={t.home.heroSearchPlaceholder} action={localePath("/courses", locale)} />
      </div>
    </header>
  );
}
