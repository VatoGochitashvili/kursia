import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { CircleTabs } from "@/components/circle/CircleTabs";
import { CircleSidebar } from "@/components/circle/CircleSidebar";

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
  const { creator, membership, community, cancelled, admins } = await loadCommunityPage(
    slug,
    viewer?.id ?? null,
    locale,
  );

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
          <h1 className="truncate text-[1.3rem]/[1.3] font-bold tracking-tight sm:text-[1.5rem]/[1.3]">
            {community.name}
          </h1>
          <p className="truncate text-[13px] text-ink-muted">
            {community.tagline || creator.displayName}
          </p>
        </div>
      </div>

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
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 animate-fade-in">{children}</div>
        <CircleSidebar
          slug={creator.slug}
          community={community}
          membership={membership}
          owner={{ displayName: creator.displayName }}
          admins={admins}
          cancelled={cancelled}
          settingsHref={localePath("/dashboard/creator/community", locale)}
          showCover={membership.isMember}
          showPrice={Boolean(viewer)}
          locale={locale}
          t={t}
        />
      </div>
    </div>
  );
}
