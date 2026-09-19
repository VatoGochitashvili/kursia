import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getPlanState } from "@/lib/creator-plan";
import { getI18n, localePath } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { unreadMessageCount } from "@/lib/social";
import { SearchBar } from "./SearchBar";
import { HeaderClient, type HeaderUser } from "./HeaderClient";
import { Logo } from "./Logo";
import { StickyHeader } from "./StickyHeader";
import { MobileHeaderSearch } from "./MobileHeaderSearch";

/**
 * Server-rendered header: the brand, primary links and the search form arrive
 * in the HTML, so navigation is crawlable and usable before hydration.
 */
export async function Header() {
  const [{ locale, t }, settings, sessionUser] = await Promise.all([
    getI18n(),
    getSettings(),
    getSessionUser(),
  ]);

  const [unread, unreadMessages] = sessionUser
    ? await Promise.all([
        db.notification.count({ where: { userId: sessionUser.id, readAt: null } }),
        unreadMessageCount(sessionUser.id),
      ])
    : [0, 0];

  // The studio link is shown only to a creator whose plan is paid — the menu
  // should not offer a door that opens onto a locked room.
  const studioOpen = sessionUser?.creatorId
    ? (await getPlanState(sessionUser.creatorId, settings.creatorPlanPriceMinor)).active
    : false;

  const user: HeaderUser | null = sessionUser
    ? {
        fullName: sessionUser.fullName,
        email: sessionUser.email,
        avatarUrl: sessionUser.avatarUrl,
        role: sessionUser.role,
        unreadNotifications: unread,
        unreadMessages,
      }
    : null;

  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;
  const otherLocale = locale === "ka" ? "en" : "ka";

  return (
    <StickyHeader>
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

        <div className="mx-auto hidden w-full max-w-md md:block">
          <SearchBar
            placeholder={t.communities.searchPlaceholder}
            action={localePath("/communities", locale)}
          />
        </div>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          {/* The one call to action in the bar, outlined so it reads as a
              button and not as another link. Gone once the plan is paid —
              that person has a circle already. */}
          {!studioOpen && (
            <Link
              href={localePath("/start", locale)}
              className="me-1 hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-brand-600 px-4 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-600 hover:text-white md:inline-flex"
            >
              <Icon name="plus" size={16} />
              {t.start.title}
            </Link>
          )}
          <HeaderClient
            user={user}
            showCreatorStudio={studioOpen}
            createCircleHref={studioOpen ? null : localePath("/start", locale)}
            localeSwitch={{
              href: localePath("/", otherLocale),
              label: otherLocale === "en" ? "English" : "ქართული",
            }}
            labels={{
              createCircle: t.start.title,
              messages: t.messages.title,
              notifications: t.nav.notifications,
              profile: t.nav.profile,
              dashboard: t.nav.dashboard,
              creatorStudio: t.nav.creatorStudio,
              admin: t.nav.admin,
              wishlist: t.nav.wishlist,
              settings: t.nav.settings,
              logout: t.nav.logout,
              login: t.nav.login,
              register: t.nav.register,
              menu: t.nav.menu,
              close: t.common.close,
            }}
          />
        </div>
      </div>

      {/* Mobile search sits below the bar so the header stays uncluttered —
          except on the homepage, whose hero already leads with one. */}
      <MobileHeaderSearch
        placeholder={t.communities.searchPlaceholder}
        action={localePath("/communities", locale)}
        homePaths={["/", "/en"]}
      />
    </StickyHeader>
  );
}
