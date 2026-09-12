import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { CommunityCard as Community } from "@/lib/communities";
import type { Dictionary } from "@/i18n";

/**
 * One community in the directory.
 *
 * The member count leads over the price. On a discovery page the question in
 * someone's head is "is anyone here?", not "what does it cost" — a busy
 * community at 40 GEL sells better than an empty one at 10, and burying the
 * count would hide the only signal a newcomer can actually read.
 */
export function CommunityCard({
  community,
  href,
  className,
  t,
}: {
  community: Community;
  href: string;
  className?: string;
  t: Dictionary;
}) {
  const free = community.priceMinor === 0;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface " +
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
          "hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg",
        className,
      )}
    >
      {/* Cover. Falls back to a tinted band rather than a grey hole, so a
          community with no artwork still looks deliberate. */}
      <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-surface-sunken">
        {community.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- covers come
          // from arbitrary user-configured hosts.
          <img
            src={community.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}

        <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
          {free ? t.membership.free : formatMoney(community.priceMinor, community.currency)}
          {!free && <span className="font-semibold text-ink-muted">{t.membership.perMonth}</span>}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 flex-1 text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-brand-700">
            {community.name}
          </h3>
          {community.isVerified && (
            <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-brand-600" />
          )}
        </div>

        {community.tagline && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
            {community.tagline}
          </p>
        )}

        {community.category && (
          <div className="mt-3">
            <Badge>{community.category.name}</Badge>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3.5 text-[12px] text-ink-subtle">
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
        </div>
      </div>
    </Link>
  );
}
