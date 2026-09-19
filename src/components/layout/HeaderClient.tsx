"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export interface HeaderUser {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: "STUDENT" | "CREATOR" | "ADMIN";
  unreadNotifications: number;
  unreadMessages: number;
}

interface Props {
  user: HeaderUser | null;
  /** True only when the creator's plan is paid; the studio is locked without it. */
  showCreatorStudio?: boolean;
  /** Where "create your circle" leads; null hides it (the plan is already paid). */
  createCircleHref: string | null;
  labels: Record<string, string>;
  localeSwitch: { href: string; label: string };
}

/**
 * Interactive header shell. The links themselves are rendered by the server
 * component around it; this only owns the menus, so the amount of JavaScript
 * shipped for navigation stays small.
 */
export function HeaderClient({
  user,
  createCircleHref,
  labels,
  localeSwitch,
  showCreatorStudio,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<"none" | "user">("none");
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Any navigation closes every menu.
  useEffect(() => {
    setMobileOpen(false);
    setMenu("none");
  }, [pathname]);

  // Click-outside and Escape close the dropdowns.
  useEffect(() => {
    if (menu === "none") return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setMenu("none");
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu("none");
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  // The body must not scroll behind the mobile drawer.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const dashboardHref =
    user?.role === "ADMIN" ? "/admin" : user?.role === "CREATOR" ? "/dashboard/creator" : "/dashboard";

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {/* Authenticated actions */}
      {user ? (
        <>
          <Link
            href="/dashboard/messages"
            aria-label={labels.messages}
            className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:inline-flex"
          >
            <Icon name="message" size={19} />
            {user.unreadMessages > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {user.unreadMessages > 9 ? "9+" : user.unreadMessages}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/notifications"
            aria-label={labels.notifications}
            className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:inline-flex"
          >
            <Icon name="bell" size={19} />
            {user.unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {user.unreadNotifications > 9 ? "9+" : user.unreadNotifications}
              </span>
            )}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu(menu === "user" ? "none" : "user")}
              aria-expanded={menu === "user"}
              aria-haspopup="true"
              aria-label={labels.profile}
              className="flex h-10 items-center gap-2 rounded-full pl-1 pr-2 transition-colors hover:bg-surface-sunken"
            >
              <Avatar src={user.avatarUrl} name={user.fullName} size={32} />
              <Icon name="chevronDown" size={14} className="hidden text-ink-subtle sm:block" />
            </button>

            {menu === "user" && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
                  <p className="truncate text-xs text-ink-subtle">{user.email}</p>
                </div>
                <nav className="p-1.5">
                  <MenuLink href={dashboardHref} icon="grid" label={labels.dashboard} />
                  {user.role === "CREATOR" && showCreatorStudio && (
                    <MenuLink href="/dashboard/creator" icon="video" label={labels.creatorStudio} />
                  )}
                  {user.role === "ADMIN" && (
                    <MenuLink href="/admin" icon="shield" label={labels.admin} />
                  )}
                  <MenuLink href="/dashboard/messages" icon="message" label={labels.messages} />
                  <MenuLink href="/dashboard/wishlist" icon="heart" label={labels.wishlist} />
                  <MenuLink href="/dashboard/profile" icon="settings" label={labels.settings} />
                </nav>
                <div className="border-t border-line p-1.5">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger-700 transition-colors hover:bg-danger-50"
                  >
                    <Icon name="logout" size={17} />
                    {labels.logout}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            {labels.login}
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {labels.register}
          </Link>
        </div>
      )}

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={labels.menu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-sunken lg:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="safe-t absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] animate-fade-in flex-col overflow-y-auto bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-ink">{labels.menu}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={labels.close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <nav className="flex-1 p-3">
              {!user && (
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-line-strong text-sm font-semibold text-ink"
                  >
                    {labels.login}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white"
                  >
                    {labels.register}
                  </Link>
                </div>
              )}

              {createCircleHref && (
                <Link
                  href={createCircleHref}
                  className="mb-3 flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-600 text-[15px] font-bold text-brand-700"
                >
                  <Icon name="plus" size={18} />
                  {labels.createCircle}
                </Link>
              )}
              {user && <MenuLink href={dashboardHref} icon="grid" label={labels.dashboard} mobile />}
              {user && <MenuLink href="/dashboard/messages" icon="message" label={labels.messages} mobile />}
              {user && <MenuLink href="/dashboard/notifications" icon="bell" label={labels.notifications} mobile />}
            </nav>

            <div className="border-t border-line p-3 safe-b">
              <Link
                href={localeSwitch.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-sunken"
              >
                <Icon name="globe" size={17} />
                {localeSwitch.label}
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-danger-700 hover:bg-danger-50"
                >
                  <Icon name="logout" size={17} />
                  {labels.logout}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  mobile,
}: {
  href: string;
  icon: IconName;
  label: string;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
        mobile ? "px-3 py-2.5 text-sm" : "px-3 py-2 text-sm",
      )}
    >
      <Icon name={icon} size={17} />
      {label}
    </Link>
  );
}
