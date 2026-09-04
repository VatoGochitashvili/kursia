import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Avatar, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Students", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorStudentsPage() {
  const { locale, t } = await getI18n();
  const creator = await requireCreator();

  const enrollments = await db.enrollment.findMany({
    where: { course: { creatorId: creator.creatorId }, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, progressPercent: true, completedLessons: true,
      createdAt: true, completedAt: true,
      course: { select: { title: true, lessonCount: true } },
      user: {
        select: {
          id: true,
          profile: { select: { fullName: true, avatarUrl: true, city: true } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title={t.creator.students}
        subtitle={`${enrollments.length} ${t.common.students.toLowerCase()}`}
      />

      {enrollments.length === 0 ? (
        <EmptyState icon={<Icon name="users" size={30} />} title={t.common.empty} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} className="flex flex-wrap items-center gap-4 p-4">
                <Avatar
                  src={enrollment.user.profile?.avatarUrl}
                  name={enrollment.user.profile?.fullName ?? "?"}
                  size={38}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {enrollment.user.profile?.fullName ?? "—"}
                  </p>
                  <p className="truncate text-[12px] text-ink-muted">
                    {enrollment.course.title}
                  </p>
                </div>

                <div className="w-full sm:w-40">
                  <ProgressBar
                    value={enrollment.progressPercent}
                    showLabel
                    tone={enrollment.completedAt ? "success" : "brand"}
                  />
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    {enrollment.completedLessons}/{enrollment.course.lessonCount}{" "}
                    {t.common.lessons}
                  </p>
                </div>

                <p className="shrink-0 text-[11px] text-ink-subtle">
                  {formatDate(enrollment.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
