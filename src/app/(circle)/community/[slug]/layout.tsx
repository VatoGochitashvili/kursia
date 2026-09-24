import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { CircleTabs } from "@/components/circle/CircleTabs";
import { CircleSidebar } from "@/components/circle/CircleSidebar";
import { Badge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * A circle's own dashboard: its name, its sections, and a side column that
 * stays put while you move between them.
 *
 * Every section — feed, classroom, calendar, members, leaderboard, about — is
 * a page inside this frame, so the frame is written once and each page only
 * draws its own content. The data comes from one cached loader, so the frame
 * and the page share a single set of queries.
 */
export default async function CircleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator, membership, community, cancelled, admins, pendingRequests } =
    await loadCommunityPage(slug, viewer?.id ?? null, locale);

  const leaders = [
    {
      userId: creator.userId,
      name: creator.displayName,
      avatarUrl: creator.avatarUrl,
      headline: creator.headline,
      role: "OWNER" as const,
    },
    ...admins,
  ];

  return (
    <div className="container-page pb-16 pt-5 sm:pt-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
          {community.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
            <img src={community.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[1.3rem]/[1.3] font-bold tracking-tight sm:text-[1.5rem]/[1.3]">
            <span className="truncate">{community.name}</span>
            {/* Whether you run this room is the first thing you should be able
                to see in it — the tools below mean nothing if you do not know
                they are yours. */}
            {membership.isOwner ? (
              <Badge tone="brand">{t.circle.owner}</Badge>
            ) : membership.isCircleAdmin ? (
              <Badge tone="success">{t.circle.admin}</Badge>
            ) : membership.isCircleModerator ? (
              <Badge>{t.circle.moderator}</Badge>
            ) : null}
          </h1>
          <p className="truncate text-[13px] text-ink-muted">
            {community.tagline || creator.displayName}
          </p>
        </div>
      </div>

      {/* A visitor gets one page about the circle, not its sections. The
          rooms behind these tabs are the thing being sold; showing their
          names to somebody who cannot open them is just a row of locked
          doors. */}
      {membership.isMember && (
      <div className="mt-4">
        <CircleTabs
          slug={creator.slug}
          locale={locale}
          labels={{
            feed: t.circle.tabFeed,
            classroom: t.circle.tabClassroom,
            events: t.circle.tabCalendar,
            members: t.circle.tabMembers,
            leaderboard: t.circle.tabLeaderboard,
            about: t.circle.tabAbout,
          }}
          pendingRequests={pendingRequests}
        />
      </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 animate-fade-in">{children}</div>
        <CircleSidebar
          slug={creator.slug}
          community={community}
          membership={membership}
          owner={{ displayName: creator.displayName }}
          admins={admins}
          leaders={leaders}
          profileBase={localePath(`/community/${creator.slug}/members`, locale)}
          cancelled={cancelled}
          settingsHref={localePath("/dashboard/creator/community", locale)}
          showCover={membership.isMember}
          showPrice={Boolean(viewer)}
          pendingRequests={pendingRequests}
          eventsHref={localePath(`/community/${creator.slug}/events`, locale)}
          membersHref={localePath(`/community/${creator.slug}/members`, locale)}
          manageLessonsHref={
            membership.isOwner || membership.isAdmin || membership.isCircleAdmin
              ? localePath(`/community/${creator.slug}/manage/lessons`, locale)
              : null
          }
          locale={locale}
          t={t}
        />
      </div>
    </div>
  );
}
