import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { effectivePriceMinor, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { COURSE_STATUSES } from "@/lib/enums";
import { PageHeader } from "@/components/layout/DashboardShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CourseModerationPanel } from "@/components/admin/CourseModerationPanel";
import { Avatar, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Course moderation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const { locale, t } = await getI18n();
  const { status, q } = await searchParams;

  const where = {
    ...(status && COURSE_STATUSES.includes(status as never) ? { status } : {}),
    ...(q ? { title: { contains: q } } : {}),
  };

  const [courses, counts] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true, slug: true, title: true, subtitle: true, status: true,
        thumbnailUrl: true, priceMinor: true, discountPriceMinor: true, currency: true,
        lessonCount: true, moduleCount: true, studentCount: true, isFeatured: true,
        submittedAt: true, updatedAt: true, reviewerNote: true,
        creator: {
          select: {
            id: true, slug: true, displayName: true, isVerified: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        category: { select: { nameKa: true, nameEn: true } },
      },
    }),
    db.course.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const p = (path: string) => localePath(path, locale);

  const filters = [
    { value: "", label: t.common.all },
    { value: "SUBMITTED", label: t.creator.statusSUBMITTED },
    { value: "UNDER_REVIEW", label: t.creator.statusUNDER_REVIEW },
    { value: "PUBLISHED", label: t.creator.statusPUBLISHED },
    { value: "CHANGES_REQUESTED", label: t.creator.statusCHANGES_REQUESTED },
    { value: "REJECTED", label: t.creator.statusREJECTED },
    { value: "DRAFT", label: t.creator.statusDRAFT },
  ];

  return (
    <>
      <PageHeader title={t.admin.courses} subtitle={`${courses.length} ${t.nav.courses.toLowerCase()}`} />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `?status=${filter.value}` : "?"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
              (status ?? "") === filter.value
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-line-strong text-ink-muted hover:bg-surface-muted",
            )}
          >
            {filter.label}
            {filter.value && countByStatus[filter.value] ? (
              <span className="tabular-nums text-ink-subtle">{countByStatus[filter.value]}</span>
            ) : null}
          </Link>
        ))}
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={<Icon name="video" size={30} />} title={t.admin.noPending} />
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={p(`/courses/${course.slug}`)}
                        className="text-[15px] font-bold text-ink hover:text-brand-600"
                      >
                        {course.title}
                      </Link>
                      <StatusBadge status={course.status} t={t} />
                      {course.isFeatured && (
                        <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {t.common.featured}
                        </span>
                      )}
                    </div>

                    {course.subtitle && (
                      <p className="mt-1 line-clamp-1 text-[13px] text-ink-muted">
                        {course.subtitle}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-muted">
                      <span className="flex items-center gap-1.5">
                        <Avatar
                          src={course.creator.user.profile?.avatarUrl}
                          name={course.creator.displayName}
                          size={20}
                        />
                        <Link
                          href={p(`/creator/${course.creator.slug}`)}
                          className="hover:text-brand-600"
                        >
                          {course.creator.displayName}
                        </Link>
                      </span>
                      {course.category && (
                        <span>
                          {locale === "en" ? course.category.nameEn : course.category.nameKa}
                        </span>
                      )}
                      <span>
                        {course.moduleCount} {t.common.modules} · {course.lessonCount}{" "}
                        {t.common.lessons}
                      </span>
                      <span className="font-semibold text-ink">
                        {formatMoney(
                          effectivePriceMinor(course.priceMinor, course.discountPriceMinor),
                          course.currency,
                          { freeLabel: t.common.free, hideDecimalsWhenWhole: true },
                        )}
                      </span>
                      {course.submittedAt && (
                        <span>
                          {t.creator.statusSUBMITTED}: {formatDate(course.submittedAt, locale)}
                        </span>
                      )}
                    </div>

                    {course.reviewerNote && (
                      <p className="mt-2.5 rounded-lg bg-surface-muted px-3 py-2 text-[12px] text-ink-muted">
                        <span className="font-semibold">{t.admin.reason}: </span>
                        {course.reviewerNote}
                      </p>
                    )}
                  </div>

                  <CourseModerationPanel
                    courseId={course.id}
                    courseSlug={course.slug}
                    status={course.status}
                    isFeatured={course.isFeatured}
                    labels={{
                      approve: t.admin.approve,
                      reject: t.admin.reject,
                      requestChanges: t.admin.requestChanges,
                      publish: t.creator.publish,
                      unpublish: t.creator.unpublish,
                      review: t.creator.statusUNDER_REVIEW,
                      feature: t.admin.feature,
                      unfeature: t.admin.unfeature,
                      reason: t.admin.reason,
                      reasonRequired: t.admin.reasonRequired,
                      submit: t.common.submit,
                      cancel: t.common.cancel,
                      preview: t.common.open,
                    }}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
