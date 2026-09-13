import { Avatar, Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { CommunityView } from "@/components/community/JoinCommunityCard";
import type { Dictionary } from "@/i18n";

/**
 * The head of every circle page.
 *
 * The facts a visitor asks first, in the order they ask them: what is this,
 * who runs it, how many people are in it, and what does it cost. The price
 * used to appear only inside the join panel, which meant a member — or anyone
 * on the calendar or leaderboard tab — could not see it at all.
 *
 * "Free" is stated as plainly as a price. Saying nothing is how people assume
 * they are about to be charged.
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
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={creator.avatarUrl} name={creator.displayName} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl">{community.name}</h1>
          <p className="mt-0.5 text-[14px] text-ink-muted">
            {community.tagline || creator.displayName}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
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

        {community.category && <Badge>{community.category.name}</Badge>}
        {isMember && <Badge tone="success">{t.membership.youAreMember}</Badge>}
      </div>

      {community.description && (
        <p className="mt-4 max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed text-ink-muted">
          {community.description}
        </p>
      )}
    </header>
  );
}
