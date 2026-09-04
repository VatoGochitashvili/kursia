import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath, fill } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatDuration, formatCount } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, ProgressBar, Stat } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * "My learning" — the student's home. Continue-learning is the primary
 * action, because resuming an unfinished course is what people come back for.
 */
export default async function StudentDashboardPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();
  const p = (path: string) => localePath(path, locale);

  const [enrollments, stats] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true, progressPercent: true, completedLessons: true,
        completedAt: true, updatedAt: true, lastLessonId: true,
        course: {
          select: {
            id: true, slug: true, title: true, thumbnailUrl: true,
            lessonCount: true, durationSeconds: true,
            creator: { select: { displayName: true } },
          },
        },
      },
    }),
    db.lessonProgress.aggregate({
      where: { userId: user.id, isCompleted: true },
      _count: { _all: true },
      _sum: { watchedSeconds: true },
    }),
  ]);

  const inProgress = enrollments.filter((e) => !e.completedAt && e.progressPercent > 0);
  const notStarted = enrollments.filter((e) => e.progressPercent === 0);
  const completed = enrollments.filter((e) => e.completedAt);
  const continueWith = inProgress[0] ?? notStarted[0] ?? null;

  return (
    <>
      <PageHeader
        title={fill(t.dashboard.welcome, { name: user.fullName.split(" ")[0] ?? user.fullName })}
        subtitle={t.dashboard.myCourses}
        action={
          <ButtonLink href={p("/courses")} variant="outline">
            <Icon name="search" size={16} />
            {t.dashboard.browseCourses}
          </ButtonLink>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t.dashboard.myCourses}
          value={enrollments.length}
          icon={<Icon name="book" size={17} />}
        />
        <Stat
          label={t.dashboard.inProgress}
          value={inProgress.length}
          icon={<Icon name="play" size={17} />}
        />
        <Stat
          label={t.dashboard.lessonsCompleted}
          value={stats._count._all}
          icon={<Icon name="check" size={17} />}
        />
        <Stat
          label={t.dashboard.hoursLearned}
          value={Math.round((stats._sum.watchedSeconds ?? 0) / 3600)}
          icon={<Icon name="clock" size={17} />}
        />
      </div>

      {/* Continue learning — one big, obvious next action. */}
      {continueWith && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg">{t.dashboard.continueLearning}</h2>
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="relative aspect-video w-full shrink-0 bg-surface-sunken sm:aspect-[16/10] sm:w-64">
                {continueWith.course.thumbnailUrl ? (
                  <Image
                    src={continueWith.course.thumbnailUrl}
                    alt=""
                    fill
                    sizes="256px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-subtle">
                    <Icon name="book" size={28} />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                <p className="text-[12px] text-ink-subtle">
                  {continueWith.course.creator.displayName}
                </p>
                <h3 className="mt-1 text-lg leading-snug">{continueWith.course.title}</h3>

                <div className="mt-4 max-w-md">
                  <ProgressBar value={continueWith.progressPercent} showLabel />
                  <p className="mt-1.5 text-[12px] text-ink-subtle">
                    {continueWith.completedLessons} / {continueWith.course.lessonCount}{" "}
                    {t.common.lessons}
                  </p>
                </div>

                <div className="mt-5">
                  <ButtonLink href={p(`/learn/${continueWith.course.slug}`)}>
                    <Icon name="play" size={16} filled />
                    {t.dashboard.continueLearning}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<Icon name="book" size={30} />}
          title={t.dashboard.noCourses}
          body={t.dashboard.noCoursesHint}
          action={<ButtonLink href={p("/courses")}>{t.dashboard.browseCourses}</ButtonLink>}
        />
      ) : (
        <>
          <CourseSection
            title={t.dashboard.myCourses}
            enrollments={[...inProgress, ...notStarted]}
            locale={locale}
            t={t}
            p={p}
          />
          {completed.length > 0 && (
            <CourseSection
              title={t.dashboard.completedCourses}
              enrollments={completed}
              locale={locale}
              t={t}
              p={p}
            />
          )}
        </>
      )}
    </>
  );
}

type EnrollmentRow = Awaited<
  ReturnType<typeof db.enrollment.findMany<{
    select: {
      id: true; progressPercent: true; completedLessons: true; completedAt: true;
      updatedAt: true; lastLessonId: true;
      course: {
        select: {
          id: true; slug: true; title: true; thumbnailUrl: true;
          lessonCount: true; durationSeconds: true;
          creator: { select: { displayName: true } };
        };
      };
    };
  }>>
>[number];

function CourseSection({
  title,
  enrollments,
  locale,
  t,
  p,
}: {
  title: string;
  enrollments: EnrollmentRow[];
  locale: "ka" | "en";
  t: Awaited<ReturnType<typeof getI18n>>["t"];
  p: (path: string) => string;
}) {
  if (enrollments.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {enrollments.map((enrollment) => (
          <li key={enrollment.id}>
            <Card className="group relative flex h-full flex-col overflow-hidden transition-all hover:border-brand-200 hover:shadow-md">
              <div className="relative aspect-[16/9] bg-surface-sunken">
                {enrollment.course.thumbnailUrl ? (
                  <Image
                    src={enrollment.course.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-subtle">
                    <Icon name="book" size={26} />
                  </div>
                )}
                {enrollment.completedAt && (
                  <span className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-success-500 text-white">
                    <Icon name="check" size={15} />
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="text-[11px] text-ink-subtle">
                  {enrollment.course.creator.displayName}
                </p>
                <h3 className="mt-1 text-[15px] font-bold leading-snug">
                  <Link
                    href={p(`/learn/${enrollment.course.slug}`)}
                    className="line-clamp-2 after:absolute after:inset-0 after:content-['']"
                  >
                    {enrollment.course.title}
                  </Link>
                </h3>

                <div className="mt-auto pt-4">
                  <ProgressBar
                    value={enrollment.progressPercent}
                    showLabel
                    tone={enrollment.completedAt ? "success" : "brand"}
                  />
                  <p className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-subtle">
                    <span>
                      {enrollment.completedLessons}/{enrollment.course.lessonCount}{" "}
                      {t.common.lessons}
                    </span>
                    {enrollment.course.durationSeconds > 0 && (
                      <span>· {formatDuration(enrollment.course.durationSeconds, locale)}</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
