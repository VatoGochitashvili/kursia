"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** Match only the exact path (used for section roots like /dashboard). */
  exact?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * Shared chrome for the student, creator and admin areas.
 *
 * Desktop gets a persistent sidebar; mobile gets a slide-over plus a bottom
 * tab bar for the handful of destinations people actually use on a phone.
 */
export function DashboardShell({
  groups,
  title,
  mobileTabs,
  children,
}: {
  groups: NavGroup[];
  title: string;
  mobileTabs?: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const nav = (
    <nav className="space-y-6 p-4" aria-label={title}>
      {groups.map((group, gi) => (
        <div key={group.title ?? gi}>
          {group.title && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-ink-subtle">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive(item)
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon name={item.icon} size={17} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ms-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto flex w-full max-w-[100rem]">
        <aside className="hidden w-60 shrink-0 border-e border-line bg-surface lg:block">
          <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto">{nav}</div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile section header */}
          <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-ink"
            >
              <Icon name="menu" size={15} />
              {title}
            </button>
          </div>

          <div className="p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</div>
        </div>
      </div>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="safe-t absolute inset-y-0 start-0 w-[min(18rem,86vw)] animate-fade-in overflow-y-auto bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-ink">{title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
                aria-label="close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      {/* Mobile bottom tabs — the destinations people actually use on a phone. */}
      {mobileTabs && mobileTabs.length > 0 && (
        <nav className="safe-b fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden">
          {mobileTabs.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive(item) ? "text-brand-600" : "text-ink-subtle",
              )}
            >
              <span className="relative">
                <Icon name={item.icon} size={19} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-accent-500" />
                )}
              </span>
              <span className="truncate px-1">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

/** Page header used inside every dashboard screen. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
