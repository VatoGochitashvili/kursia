import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { getCourseAnalytics, getLessonEngagement } from "@/lib/creator-analytics";
import { formatMoney } from "@/lib/money";
import { formatCount, formatDuration } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { locale, t } = await getI18n();
  const creator = await requireCreator();
  const { course: selectedId } = await searchParams;

  const courses = await getCourseAnalytics(creator.creatorId);
  const selected = selectedId ? courses.find((c) => c.id === selectedId) : courses[0];
  const lessons = selected ? await getLessonEngagement(selected.id) : [];

  const pct = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

  return (
    <>
      <PageHeader title={t.creator.analytics} subtitle={t.creator.myCourses} />

      {courses.length === 0 ? (
        <EmptyState icon={<Icon name="chart" size={30} />} title={t.common.empty} />
      ) : (
        <>
          <Card className="mb-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b border-line bg-surface-muted text-[12px] text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-start font-semibold">{t.nav.courses}</th>
                    <th className="px-4 py-2.5 text-end font-semibold">{t.creator.courseViews}</th>
                    <th className="px-4 py-2.5 text-end font-semibold">
                      {locale === "en" ? "Visitors" : "ვიზიტორი"}
                    </th>
                    <th className="px-4 py-2.5 text-end font-semibold">{t.creator.totalSales}</th>
                    <th className="px-4 py-2.5 text-end font-semibold">
                      {t.creator.conversionRate}
                    </th>
                    <th className="px-4 py-2.5 text-end font-semibold">
                      {locale === "en" ? "Completion" : "დასრულება"}
                    </th>
                    <th className="px-4 py-2.5 text-end font-semibold">{t.creator.earnings}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className={
                        course.id === selected?.id ? "bg-brand-50/50" : "hover:bg-surface-muted/60"
                      }
                    >
                      <td className="px-4 py-3">
                        <a
                          href={`?course=${course.id}`}
                          className="flex items-center gap-2 font-medium text-ink hover:text-brand-600"
                        >
                          <span className="max-w-[18rem] truncate">{course.title}</span>
                          <StatusBadge status={course.status} t={t} />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {formatCount(course.views, locale)}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {formatCount(course.uniqueVisitors, locale)}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">{course.sales}</td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {pct(course.conversionRate)}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {pct(course.completionRate)}
                      </td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">
                        {formatMoney(course.revenueMinor, course.currency, {
                          hideDecimalsWhenWhole: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selected && (
            <Card className="p-5">
              <h2 className="mb-1 text-base">
                {locale === "en" ? "Lesson engagement" : "გაკვეთილების ჩართულობა"}
              </h2>
              <p className="mb-4 text-[13px] text-ink-muted">{selected.title}</p>

              {lessons.length === 0 ? (
                <p className="text-[13px] text-ink-subtle">{t.common.empty}</p>
              ) : (
                <ul className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <li key={lesson.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-[13px] text-ink">
                          <span className="text-ink-subtle">{index + 1}.</span> {lesson.title}
                          {lesson.durationSeconds > 0 && (
                            <span className="ms-2 text-[11px] text-ink-subtle">
                              {formatDuration(lesson.durationSeconds, locale)}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-muted">
                          {lesson.completions} · {Math.round(lesson.completionRate)}%
                        </span>
                      </div>
                      {/* A steep drop between consecutive lessons is where
                          students give up — the reason to show this at all. */}
                      <ProgressBar value={lesson.completionRate} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
