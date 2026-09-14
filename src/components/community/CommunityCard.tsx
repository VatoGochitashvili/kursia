import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { CommunityCard as Community } from "@/lib/communities";
import type { Dictionary } from "@/i18n";

/**
 * One circle in the directory.
 *
 * The cover carries the card: it answers "what kind of place is this" before
 * a word is read. No owner photo on top of it — two images competing on one
 * small card read as clutter, and the circle is the thing being chosen here.
 *
 * Motion is two things only, a lift and a slow zoom of the cover on hover,
 * and both stop under prefers-reduced-motion.
 */
export function CommunityCard({
  community,
  href,
  className,
  priority,
  t,
}: {
  community: Community;
  href: string;
  className?: string;
  /** First visible row: its covers load immediately rather than lazily. */
  priority?: boolean;
  t: Dictionary;
}) {
  const free = community.priceMinor === 0;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface " +
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
          "hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_18px_40px_-20px_rgb(13_17_23_/_0.35)]",
        className,
      )}
    >
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-surface-sunken">
        {community.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers come
          // from user-configured hosts as well as our own storage.
          <img
            src={community.coverUrl}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-100 via-brand-50 to-surface-sunken" />
        )}

        {community.category && (
          <span className="absolute left-3 top-3 max-w-[60%] truncate rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
            {community.category.name}
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-baseline gap-0.5 rounded-full bg-surface/95 px-2.5 py-1 text-[12px] font-bold text-ink shadow-sm backdrop-blur">
          {free ? t.membership.free : formatMoney(community.priceMinor, community.currency)}
          {!free && (
            <span className="text-[11px] font-semibold text-ink-muted">{t.membership.perMonth}</span>
          )}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-[16px] font-bold leading-snug text-ink transition-colors group-hover:text-brand-700">
          {community.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-subtle">
          {community.creatorName}
          {community.isVerified && <Icon name="shield" size={12} className="text-brand-600" />}
        </p>

        {community.tagline && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
            {community.tagline}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[12px] text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="users" size={13} />
            {fill(t.membership.members, { count: formatNumber(community.memberCount) })}
          </span>
          {community.courseCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="video" size={13} />
              {fill(t.communities.courseCount, { count: String(community.courseCount) })}
            </span>
          )}
          <Icon
            name="arrowRight"
            size={15}
            className="text-ink-subtle transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand-600"
          />
        </div>
      </div>
    </Link>
  );
}
