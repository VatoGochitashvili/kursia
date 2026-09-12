import Link from "next/link";
import { localePath } from "@/i18n/config";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

/**
 * Feed / calendar switch.
 *
 * Plain links rather than client-side tab state: these are two pages with two
 * URLs, so a member can send someone straight to the calendar, and the back
 * button does what it looks like it does.
 */
export function CommunityTabs({
  slug,
  active,
  locale,
  t,
}: {
  slug: string;
  active: "feed" | "events" | "leaderboard";
  locale: Locale;
  t: Dictionary;
}) {
  const tabs: {
    key: "feed" | "events" | "leaderboard";
    href: string;
    label: string;
    icon: IconName;
  }[] = [
    { key: "feed", href: `/community/${slug}`, label: t.community.title, icon: "message" },
    { key: "events", href: `/community/${slug}/events`, label: t.events.title, icon: "calendar" },
    {
      key: "leaderboard",
      href: `/community/${slug}/leaderboard`,
      label: t.leaderboard.title,
      icon: "award",
    },
  ];

  // Full width on a phone with the three tabs sharing it, an inline pill group
  // from sm up. Three Georgian labels plus their icons come to ~448px, which
  // is wider than a 375px screen and would scroll the whole page sideways, so
  // the icons stand down first — they are decoration, the labels are not.
  return (
    <div className="mb-5 flex w-full rounded-xl bg-surface-sunken p-1 sm:inline-flex sm:w-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={localePath(tab.href, locale)}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 " +
              "text-[13px] font-semibold transition-colors sm:flex-none sm:px-4",
            active === tab.key
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon name={tab.icon} size={15} className="hidden shrink-0 sm:block" />
          <span className="truncate">{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}
