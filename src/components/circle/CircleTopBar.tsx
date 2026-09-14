import Link from "next/link";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";

/**
 * The bar across the top of a circle.
 *
 * Deliberately thin. Inside a circle the marketplace's own navigation —
 * categories, search, "become a creator" — is noise; what someone needs is
 * the way back to all circles, their notifications, and their account.
 */
export async function CircleTopBar() {
  const [{ locale, t }, settings, user] = await Promise.all([
    getI18n(),
    getSettings(),
    getSessionUser(),
  ]);
  const p = (path: string) => localePath(path, locale);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  const unread = user
    ? await db.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  const accountHref = !user
    ? p("/login")
    : user.role === "ADMIN"
      ? p("/admin")
      : user.creatorId
        ? p("/dashboard/creator")
        : p("/dashboard");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="container-page flex h-14 items-center gap-3">
        <Link href={p("/")} className="flex items-center gap-2" aria-label={brand}>
          <Logo size={24} />
          <span className="text-[15px] font-bold tracking-tight">{brand}</span>
        </Link>
        <span aria-hidden="true" className="text-line-strong">
          /
        </span>
        <Link
          href={p("/communities")}
          className="text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t.circle.allCircles}
        </Link>

        <div className="ms-auto flex items-center gap-1.5">
          {user ? (
            <>
              <Link
                href={p("/dashboard/notifications")}
                aria-label={t.nav.notifications}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <Icon name="bell" size={18} />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600" />
                )}
              </Link>
              <Link href={accountHref} aria-label={t.nav.dashboard} className="ms-1">
                <Avatar src={user.avatarUrl} name={user.fullName} size={32} />
              </Link>
            </>
          ) : (
            <>
              <Link
                href={p("/login")}
                className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold text-ink-muted hover:text-ink"
              >
                {t.nav.login}
              </Link>
              <Link
                href={p("/register")}
                className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                {t.nav.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
