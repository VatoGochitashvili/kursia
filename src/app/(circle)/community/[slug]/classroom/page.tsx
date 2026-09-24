import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

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
 * Lists what the creator put INSIDE the membership, not their whole catalogue:
 * a course kept as a separate purchase does not belong on a page that says
 * "this is what you already have". Progress is loaded only for a member.
 */
export default async function ClassroomPage({ params }: Props) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator, membership, community, gate } = await loadCommunityPage(
    slug,
    viewer?.id ?? null,
    locale,
  );
  const p = (path: string) => localePath(path, locale);

  // One page for a visitor: everything about the circle lives there, and
  // the sections are what membership opens.
  if (!membership.isMember) redirect(p(`/community/${creator.slug}`));

  const courses = await db.course.findMany({
    where: { creatorId: creator.id, includedInMembership: true, status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, slug: true, title: true, subtitle: true, thumbnailUrl: true, lessonCount: true },
  });

  // One query for every course's progress rather than one per course.
  const progressByCourse = new Map<string, number>();
  if (viewer && courses.length > 0) {
    const done = await db.lessonProgress.groupBy({
      by: ["courseId"],
      where: { userId: viewer.id, isCompleted: true, courseId: { in: courses.map((c) => c.id) } },
      _count: { _all: true },
    });
    for (const row of done) progressByCourse.set(row.courseId, row._count._all);
  }

  if (courses.length === 0) {
    return (
      <Card className="p-10 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="video" size={24} />
        </span>
        <h2 className="mt-5 text-lg">{t.communities.classroomEmpty}</h2>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3">
      {courses.map((course) => {
        const completed = progressByCourse.get(course.id) ?? 0;
        const percent =
          course.lessonCount > 0 ? Math.min(100, Math.round((completed / course.lessonCount) * 100)) : 0;

        return (
          <li key={course.id}>
            <Link
              href={p(`/learn/${course.slug}`)}
              className="group flex gap-4 rounded-2xl border border-line bg-surface p-3.5 transition-all duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-md sm:p-4"
            >
              <div className="h-[68px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                {course.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- user-configured hosts
                  <img src={course.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{course.subtitle}</p>
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
  );
}
