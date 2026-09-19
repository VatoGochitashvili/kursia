import Link from "next/link";
import { Badge, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { JoinCommunityCard, type CommunityView } from "@/components/community/JoinCommunityCard";
import { CopyLinkButton } from "@/components/circle/CopyLinkButton";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { Membership } from "@/lib/community";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

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
  cancelled,
  settingsHref,
  showCover,
  showPrice = true,
  locale,
  t,
}: {
  slug: string;
  community: CommunityView;
  membership: Membership;
  owner: { displayName: string };
  admins: { userId: string; name: string }[];
  cancelled: boolean;
  settingsHref: string;
  /**
   * Off for visitors: their page already opens on the full cover banner, and
   * the same photo twice, side by side, reads as a layout mistake.
   */
  showCover: boolean;
  /** Off for signed-out visitors, who see the join button before any price. */
  showPrice?: boolean;
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
              <img src={community.coverUrl} alt="" className="h-full w-full object-cover" />
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
            <p className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">{t.circle.owner}</span>
              <span className="truncate font-semibold">{owner.displayName}</span>
            </p>
            {admins.length > 0 && (
              <p className="flex items-start justify-between gap-2">
                <span className="text-ink-muted">{t.circle.admins}</span>
                <span className="text-end font-semibold">{admins.map((a) => a.name).join(", ")}</span>
              </p>
            )}
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
