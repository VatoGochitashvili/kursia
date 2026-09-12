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
  active: "feed" | "events";
  locale: Locale;
  t: Dictionary;
}) {
  const tabs: { key: "feed" | "events"; href: string; label: string; icon: IconName }[] = [
    { key: "feed", href: `/community/${slug}`, label: t.community.title, icon: "message" },
    { key: "events", href: `/community/${slug}/events`, label: t.events.title, icon: "calendar" },
  ];

  return (
    <div className="mb-5 inline-flex rounded-xl bg-surface-sunken p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={localePath(tab.href, locale)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold transition-colors",
            active === tab.key
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon name={tab.icon} size={15} />
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
