"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localePath } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/enums";

type TabKey = "feed" | "classroom" | "events" | "members" | "leaderboard" | "about";

/**
 * The circle's own navigation.
 *
 * Underlined tabs rather than a pill switch: six sections do not fit a pill
 * group on a phone, and an underline scrolls sideways inside its own strip
 * without ever pushing the page wider than the screen.
 *
 * The active tab comes from the URL, so it is right after a refresh, a shared
 * link or the back button — there is no client state to fall out of step.
 */
export function CircleTabs({
  slug,
  locale,
  labels,
  pendingRequests = 0,
}: {
  slug: string;
  locale: Locale;
  labels: Record<TabKey, string>;
  /** Applications waiting on this viewer, badged on the members tab. */
  pendingRequests?: number;
}) {
  const pathname = usePathname() ?? "";
  const base = localePath(`/community/${slug}`, locale);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";
  const active = (rest.split("/")[0] || "feed") as TabKey;

  const tabs: { key: TabKey; href: string }[] = [
    { key: "feed", href: `/community/${slug}` },
    { key: "classroom", href: `/community/${slug}/classroom` },
    { key: "events", href: `/community/${slug}/events` },
    { key: "members", href: `/community/${slug}/members` },
    { key: "leaderboard", href: `/community/${slug}/leaderboard` },
    { key: "about", href: `/community/${slug}/about` },
  ];

  return (
    <nav
      aria-label={labels.feed}
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab) => {
          const on = active === tab.key;
          return (
            <li key={tab.key}>
              <Link
                href={localePath(tab.href, locale)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center px-3.5 text-[14px] font-semibold transition-colors",
                  on ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {labels[tab.key]}
                {tab.key === "members" && pendingRequests > 0 && (
                  <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                    {pendingRequests}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    on ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
