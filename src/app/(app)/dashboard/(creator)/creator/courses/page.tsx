import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { effectivePriceMinor, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "My courses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorCoursesPage() {
  const { locale, t } = await getI18n();
  const creator = await requireCreator();

  const courses = await db.course.findMany({
    where: { creatorId: creator.creatorId },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true, slug: true, title: true, subtitle: true, status: true,
      thumbnailUrl: true, priceMinor: true, discountPriceMinor: true, currency: true,
      studentCount: true, lessonCount: true, ratingAvg: true, ratingCount: true,
      viewCount: true, updatedAt: true, reviewerNote: true,
    },
  });

  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <PageHeader
        title={t.creator.myCourses}
        subtitle={`${courses.length} ${t.nav.courses.toLowerCase()}`}
        action={
          <ButtonLink href={p("/dashboard/creator/courses/new")}>
            <Icon name="plus" size={16} />
            {t.creator.newCourse}
          </ButtonLink>
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={<Icon name="video" size={30} />}
          title={t.creator.createFirstCourse}
          body={t.home.creatorCtaBody}
          action={
            <ButtonLink href={p("/dashboard/creator/courses/new")}>
              {t.creator.newCourse}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => {
            const price = effectivePriceMinor(course.priceMinor, course.discountPriceMinor);
            const needsAttention =
              course.status === "CHANGES_REQUESTED" || course.status === "REJECTED";

            return (
              <li key={course.id}>
                <Card className="overflow-hidden transition-colors hover:border-brand-200">
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative aspect-video w-full shrink-0 bg-surface-sunken sm:aspect-[16/10] sm:w-48">
                      {course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt=""
                          fill
                          sizes="192px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-ink-subtle">
                          <Icon name="book" size={24} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={p(`/dashboard/creator/courses/${course.id}`)}
                            className="text-[15px] font-bold text-ink hover:text-brand-600"
                          >
                            {course.title}
                          </Link>
                          {course.subtitle && (
                            <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">
                              {course.subtitle}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={course.status} t={t} />
                      </div>

                      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-muted">
                        <Pair label={t.common.students} value={String(course.studentCount)} />
                        <Pair label={t.common.lessons} value={String(course.lessonCount)} />
                        <Pair label={t.creator.courseViews} value={String(course.viewCount)} />
                        <Pair
                          label={t.common.rating}
                          value={course.ratingCount > 0 ? course.ratingAvg.toFixed(1) : "—"}
                        />
                        <Pair
                          label={t.courses.filterPrice}
                          value={formatMoney(price, course.currency, {
                            freeLabel: t.common.free,
                            hideDecimalsWhenWhole: true,
                          })}
                        />
                      </dl>

                      {needsAttention && course.reviewerNote && (
                        <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-[12px] text-warn-700">
                          <span className="font-semibold">{t.admin.reason}: </span>
                          {course.reviewerNote}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <ButtonLink
                          href={p(`/dashboard/creator/courses/${course.id}`)}
                          size="sm"
                          variant="outline"
                        >
                          <Icon name="edit" size={14} />
                          {t.common.edit}
                        </ButtonLink>
                        {course.status === "PUBLISHED" && (
                          <ButtonLink
                            href={p(`/courses/${course.slug}`)}
                            size="sm"
                            variant="ghost"
                          >
                            <Icon name="external" size={14} />
                            {t.common.open}
                          </ButtonLink>
                        )}
                        <span className="ms-auto text-[11px] text-ink-subtle">
                          {t.courses.lastUpdated} {formatDate(course.updatedAt, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}:</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
