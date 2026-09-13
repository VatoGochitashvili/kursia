import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { Badge, Breadcrumbs, Card, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { CommunityTabs } from "@/components/community/CommunityTabs";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityGate } from "@/components/community/CommunityGate";
import { JoinCommunityCard } from "@/components/community/JoinCommunityCard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale, t }, creator] = await Promise.all([
    getI18n(),
    db.creatorProfile.findUnique({ where: { slug }, select: { displayName: true } }),
  ]);

  return buildMetadata({
    title: `${creator?.displayName ?? ""} — ${t.communities.classroom}`,
    description: t.membership.perkCourses,
    path: `/community/${slug}/classroom`,
    locale,
    noindex: true,
  });
}

/**
 * The classroom — the courses a membership opens.
 *
 * Lists what the creator put INSIDE the membership, not their whole
 * catalogue: a course they deliberately kept as a separate purchase does not
 * belong on a page that says "this is what you already have".
 *
 * Progress is per lesson and only loaded for a member, since a visitor
 * looking at the paywall has none to show.
 */
export default async function ClassroomPage({ params }: Props) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator, membership, community, cancelled, gate } = await loadCommunityPage(
    slug,
    viewer?.id ?? null,
    locale,
  );
  const p = (path: string) => localePath(path, locale);

  const courses = membership.isMember
    ? await db.course.findMany({
        where: {
          creatorId: creator.id,
          includedInMembership: true,
          status: "PUBLISHED",
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          thumbnailUrl: true,
          lessonCount: true,
        },
      })
    : [];

  // One query for every course's progress rather than one per course.
  const progressByCourse = new Map<string, number>();
  if (viewer && courses.length > 0) {
    const done = await db.lessonProgress.groupBy({
      by: ["courseId"],
      where: {
        userId: viewer.id,
        isCompleted: true,
        courseId: { in: courses.map((c) => c.id) },
      },
      _count: { _all: true },
    });
    for (const row of done) progressByCourse.set(row.courseId, row._count._all);
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: locale === "en" ? "Home" : "მთავარი", href: p("/") },
          { label: creator.displayName, href: p(`/creator/${creator.slug}`) },
          { label: t.communities.classroom },
        ]}
      />

      <CommunityHeader
        creator={creator}
        community={community}
        isMember={membership.isMember}
        t={t}
      />

      <div className="mx-auto max-w-2xl">
        <CommunityTabs slug={creator.slug} active="classroom" locale={locale} t={t} />

        {membership.isSubscriber && (
          <div className="mb-5">
            <JoinCommunityCard
              community={community}
              isAuthenticated
              isOwner={false}
              isSubscriber
              memberUntil={membership.memberUntil?.toISOString() ?? null}
              cancelled={cancelled}
              loginHref={p("/login")}
              locale={locale}
              t={t}
            />
          </div>
        )}

        {!membership.isMember ? (
          <CommunityGate
            community={community}
            creatorSlug={creator.slug}
            isAuthenticated={Boolean(viewer)}
            isOwner={membership.isOwner}
            gate={gate}
            loginHref={p(`/login?next=/community/${creator.slug}/classroom`)}
            coursesHref={p(`/creator/${creator.slug}`)}
            locale={locale}
            t={t}
          />
        ) : courses.length === 0 ? (
          <Card className="p-10 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon name="video" size={24} />
            </span>
            <h2 className="mt-5 text-lg">{t.communities.classroomEmpty}</h2>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {courses.map((course) => {
              const completed = progressByCourse.get(course.id) ?? 0;
              const percent =
                course.lessonCount > 0
                  ? Math.min(100, Math.round((completed / course.lessonCount) * 100))
                  : 0;

              return (
                <li key={course.id}>
                  <Link
                    href={p(`/learn/${course.slug}`)}
                    className="group flex gap-4 rounded-2xl border border-line bg-surface p-3.5 transition-all duration-200 hover:-translate-y-px hover:border-brand-200 hover:shadow-md sm:p-4"
                  >
                    <div className="h-[68px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                      {course.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- user-configured hosts
                        <img
                          src={course.thumbnailUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="line-clamp-1 text-[15px] font-semibold transition-colors group-hover:text-brand-700">
                          {course.title}
                        </h2>
                        {percent === 100 && <Badge tone="success">{t.learn.completed}</Badge>}
                      </div>

                      {course.subtitle && (
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">
                          {course.subtitle}
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center gap-2.5">
                        <ProgressBar value={percent} className="flex-1" />
                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-subtle">
                          {completed}/{course.lessonCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
