import Link from "next/link";
import { Badge, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { JoinCommunityCard, type CommunityView } from "@/components/community/JoinCommunityCard";
import { CopyLinkButton } from "@/components/circle/CopyLinkButton";
import { CircleLeaders, type Leader } from "@/components/circle/CircleLeaders";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { Membership } from "@/lib/community";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";
import { imageAt } from "@/lib/images";

/**
 * The circle's side column: what it is, what it costs, who runs it, and — for
 * a paying member — their own renewal.
 *
 * Cover only, no owner photo. The owner and admins are named, because who
 * approves you and who moderates the room is information a member needs; their
 * faces are not.
 */
export function CircleSidebar({
  slug,
  community,
  membership,
  owner,
  admins,
  leaders,
  profileBase,
  cancelled,
  settingsHref,
  showCover,
  showPrice = true,
  pendingRequests = 0,
  eventsHref,
  membersHref,
  manageLessonsHref,
  locale,
  t,
}: {
  slug: string;
  community: CommunityView;
  membership: Membership;
  owner: { displayName: string };
  admins: { userId: string; name: string }[];
  /** Owner and admins with their photos — shown to visitors too. */
  leaders: Leader[];
  profileBase: string;
  cancelled: boolean;
  settingsHref: string;
  /**
   * Off for visitors: their page already opens on the full cover banner, and
   * the same photo twice, side by side, reads as a layout mistake.
   */
  showCover: boolean;
  /** Off for signed-out visitors, who see the join button before any price. */
  showPrice?: boolean;
  /** Applications waiting on a decision; only ever non-zero for a moderator. */
  pendingRequests?: number;
  eventsHref: string;
  membersHref: string;
  /** Null for a moderator: the classroom is not theirs to change. */
  manageLessonsHref: string | null;
  locale: Locale;
  t: Dictionary;
}) {
  const free = community.priceMinor === 0;

  return (
    <aside className="grid gap-4 lg:sticky lg:top-20">
      <Card className="overflow-hidden">
        {showCover && (
          <div className="aspect-[16/9] bg-surface-sunken">
            {community.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
              <img src={imageAt(community.coverUrl, 640) ?? undefined} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand-100 via-brand-50 to-surface-sunken" />
            )}
          </div>
        )}

        <div className="p-4">
          <p className="text-[15px] font-bold leading-snug">{community.name}</p>
          {community.tagline && (
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{community.tagline}</p>
          )}

          <dl
            className={`mt-4 grid gap-3 border-t border-line pt-4 text-center ${showPrice ? "grid-cols-2" : "grid-cols-1"}`}
          >
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
                {t.circle.members}
              </dt>
              <dd className="mt-0.5 text-[16px] font-bold tabular-nums">
                {formatNumber(community.memberCount)}
              </dd>
            </div>
            {showPrice && (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
                {t.circle.price}
              </dt>
              <dd className="mt-0.5 text-[16px] font-bold">
                {free ? t.membership.free : formatMoney(community.priceMinor, community.currency)}
              </dd>
            </div>
            )}
          </dl>

          <div className="mt-4 grid gap-1.5 border-t border-line pt-4 text-[13px]">
            {community.category && (
              <p className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">{t.membership.categoryLabel}</span>
                <Badge>{community.category.name}</Badge>
              </p>
            )}
            {community.includedCourseCount > 0 && (
              <p className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">{t.circle.tabClassroom}</span>
                <span className="font-semibold">
                  {fill(t.communities.courseCount, { count: String(community.includedCourseCount) })}
                </span>
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <CopyLinkButton
              path={`/community/${slug}`}
              label={t.circle.invite}
              copiedLabel={t.circle.copied}
            />
            {membership.isOwner && (
              <Link
                href={settingsHref}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-ink text-[13px] font-semibold text-white transition-colors hover:bg-ink/90"
              >
                <Icon name="settings" size={14} />
                {t.circle.manage}
              </Link>
            )}
          </div>
        </div>
      </Card>

      <CircleLeaders
        leaders={leaders}
        profileBase={profileBase}
        // A member's profile page is inside the circle, so only a member can
        // open one.
        linked={membership.isMember}
        t={t}
      />

      {/* What running this circle actually gives you. Without it, an admin
          sees exactly what a member sees and has no idea the approvals queue
          is theirs. */}
      {membership.canModerate && (
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-[14px] font-bold">
            <Icon name="shield" size={16} className="text-brand-600" />
            {t.circle.adminTools}
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            {membership.isOwner ? t.circle.ownerToolsHint : t.circle.adminToolsHint}
          </p>
          <div className="mt-3 grid gap-1.5">
            <Link
              href={membersHref}
              className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-sunken"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user" size={14} />
                {pendingRequests > 0 ? t.circle.pendingRequestsLink : t.circle.manageMembers}
              </span>
              {pendingRequests > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                  {pendingRequests}
                </span>
              )}
            </Link>
            {manageLessonsHref && (
              <Link
                href={manageLessonsHref}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-sunken"
              >
                <Icon name="video" size={14} />
                {t.circle.manageLessons}
              </Link>
            )}
            <Link
              href={eventsHref}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-sunken"
            >
              <Icon name="calendar" size={14} />
              {t.circle.scheduleEvent}
            </Link>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-ink-subtle">
            {t.circle.moderateHint}
          </p>
        </Card>
      )}

      {membership.isSubscriber && (
        <JoinCommunityCard
          community={community}
          isAuthenticated
          isOwner={false}
          isSubscriber
          memberUntil={membership.memberUntil?.toISOString() ?? null}
          cancelled={cancelled}
          loginHref="/login"
          locale={locale}
          t={t}
        />
      )}
    </aside>
  );
}
