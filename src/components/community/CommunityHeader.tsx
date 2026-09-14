import { Avatar, Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { CommunityView } from "@/components/community/JoinCommunityCard";
import type { Dictionary } from "@/i18n";

/**
 * The head of every circle page: a cover photo, the owner, and the facts a
 * visitor asks first — how many people are here, and what it costs.
 *
 * The photo does the work decoration used to try to do. It is the one thing
 * on the page that tells you, before reading a word, what kind of place this
 * is — a gym, a trading desk, a yoga room.
 *
 * The gradient over the bottom of the photo is not decoration either: it is
 * what keeps the avatar ring readable against a bright image.
 */
export function CommunityHeader({
  creator,
  community,
  isMember,
  t,
}: {
  creator: { displayName: string; avatarUrl: string | null };
  community: CommunityView;
  isMember: boolean;
  t: Dictionary;
}) {
  const free = community.priceMinor === 0;

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative h-40 bg-surface-sunken sm:h-56">
        {community.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers come
          // from user-configured hosts as well as our own storage.
          <img
            src={community.coverUrl}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="h-full w-full animate-fade-in object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-100 via-brand-50 to-surface-sunken" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-10 animate-fade-up sm:-mt-12">
          <Avatar
            src={creator.avatarUrl}
            name={creator.displayName}
            size={80}
            className="ring-4 ring-surface"
          />
        </div>

        <div className="mt-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-2xl sm:text-[1.9rem]/[1.25]">{community.name}</h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            {community.tagline || creator.displayName}
          </p>
        </div>

        <div
          className="mt-4 flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted"
          style={{ animationDelay: "120ms" }}
        >
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            {free ? (
              <>
                <Icon name="unlock" size={15} className="text-success-700" />
                {t.membership.free}
              </>
            ) : (
              <>
                <Icon name="wallet" size={15} />
                {formatMoney(community.priceMinor, community.currency)}
                <span className="font-medium text-ink-muted">{t.membership.perMonth}</span>
              </>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Icon name="users" size={14} />
            {fill(t.membership.members, { count: formatNumber(community.memberCount) })}
          </span>

          {community.includedCourseCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="video" size={14} />
              {fill(t.communities.courseCount, { count: String(community.includedCourseCount) })}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5">
            <Icon name="user" size={14} />
            {creator.displayName}
          </span>

          {community.category && <Badge>{community.category.name}</Badge>}
          {isMember && <Badge tone="success">{t.membership.youAreMember}</Badge>}
        </div>

        {community.description && (
          <p
            className="mt-4 max-w-prose animate-fade-up whitespace-pre-wrap text-[14px] leading-relaxed text-ink-muted"
            style={{ animationDelay: "180ms" }}
          >
            {community.description}
          </p>
        )}
      </div>
    </header>
  );
}
