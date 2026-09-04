import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { requireCreator } from "@/lib/auth/rbac";
import { getCreatorOverview } from "@/lib/creator-analytics";
import { getBalanceSummary } from "@/lib/earnings";
import { formatMoney, bpsToPercent } from "@/lib/money";
import { formatCount } from "@/lib/format";
import { resolveCommissionBps } from "@/lib/settings";
import { PageHeader } from "@/components/layout/DashboardShell";
import { RevenueChart, SalesBarChart } from "@/components/charts/Charts";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar, Card, EmptyState, Stars, Stat } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "Creator studio", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorDashboardPage() {
  const [{ locale, t }, settings, creator] = await Promise.all([
    getI18n(),
    getSettings(),
    requireCreator(),
  ]);

  const [overview, balance, commissionBps] = await Promise.all([
    getCreatorOverview(creator.creatorId, 30),
    getBalanceSummary(creator.creatorId),
    resolveCommissionBps(creator.creatorId),
  ]);

  const p = (path: string) => localePath(path, locale);
  const currency = settings.currency;
  const money = (minor: number) =>
    formatMoney(minor, currency, { hideDecimalsWhenWhole: true, locale: locale === "en" ? "en-GB" : "ka-GE" });

  return (
    <>
      <PageHeader
        title={t.creator.studio}
        subtitle={creator.fullName}
        action={
          <ButtonLink href={p("/dashboard/creator/courses/new")}>
            <Icon name="plus" size={16} />
            {t.creator.newCourse}
          </ButtonLink>
        }
      />

      {overview.courses.length === 0 ? (
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
        <>
          {/* Headline numbers */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t.creator.totalRevenue}
              value={money(overview.earningsMinor)}
              hint={`${t.creator.platformFee} ${bpsToPercent(commissionBps)}%`}
              icon={<Icon name="wallet" size={17} />}
            />
            <Stat
              label={t.creator.revenueThisMonth}
              value={money(overview.monthRevenueMinor)}
              hint={`${overview.monthSales} ${t.creator.totalSales.toLowerCase()}`}
              icon={<Icon name="chart" size={17} />}
            />
            <Stat
              label={t.creator.totalStudents}
              value={formatCount(overview.totalStudents, locale)}
              hint={`${overview.totalSales} ${t.creator.totalSales.toLowerCase()}`}
              icon={<Icon name="users" size={17} />}
            />
            <Stat
              label={t.creator.averageRating}
              value={overview.averageRating > 0 ? overview.averageRating.toFixed(1) : "—"}
              hint={`${overview.reviewCount} ${t.common.reviews}`}
              icon={<Icon name="star" size={17} />}
            />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t.creator.availableBalance}
              value={money(balance.withdrawableMinor)}
              hint={`${t.creator.pendingBalance}: ${money(balance.pendingMinor)}`}
              icon={<Icon name="bank" size={17} />}
            />
            <Stat
              label={t.creator.courseViews}
              value={formatCount(overview.totalViews, locale)}
              hint={`${formatCount(overview.viewsInPeriod, locale)} / 30${locale === "en" ? "d" : "დღე"}`}
              icon={<Icon name="eye" size={17} />}
            />
            <Stat
              label={t.creator.conversionRate}
              value={
                overview.conversionRate === null ? "—" : `${overview.conversionRate.toFixed(1)}%`
              }
              hint={locale === "en" ? "sales / views" : "გაყიდვა / ნახვა"}
              icon={<Icon name="target" size={17} />}
            />
            <Stat
              label={t.creator.myCourses}
              value={overview.courses.length}
              hint={`${overview.publishedCount} ${t.creator.statusPUBLISHED.toLowerCase()}`}
              icon={<Icon name="video" size={17} />}
            />
          </div>

          {/* Charts */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <RevenueChart
                data={overview.series}
                currency={currency}
                locale={locale}
                title={
                  locale === "en" ? "Earnings — last 30 days" : "შემოსავალი — ბოლო 30 დღე"
                }
                emptyLabel={locale === "en" ? "No sales yet" : "გაყიდვები ჯერ არ არის"}
              />
            </Card>
            <Card className="p-5">
              <SalesBarChart
                data={overview.series}
                locale={locale}
                title={locale === "en" ? "Sales — last 30 days" : "გაყიდვები — ბოლო 30 დღე"}
                emptyLabel={locale === "en" ? "No sales yet" : "გაყიდვები ჯერ არ არის"}
              />
            </Card>
          </div>

          {/* Recent activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base">{t.creator.recentPurchases}</h2>
                <Link
                  href={p("/dashboard/creator/sales")}
                  className="text-[13px] font-semibold text-brand-600 hover:underline"
                >
                  {t.common.seeAll}
                </Link>
              </div>

              {overview.recentPurchases.length === 0 ? (
                <p className="text-[13px] text-ink-subtle">{t.common.empty}</p>
              ) : (
                <ul className="space-y-3">
                  {overview.recentPurchases.map((purchase) => (
                    <li key={purchase.id} className="flex items-center gap-3">
                      <Avatar
                        src={purchase.user.profile?.avatarUrl}
                        name={purchase.user.profile?.fullName ?? "?"}
                        size={32}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {purchase.user.profile?.fullName ?? "—"}
                        </p>
                        <p className="truncate text-[11px] text-ink-subtle">
                          {purchase.course.title}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="text-[13px] font-bold tabular-nums text-ink">
                          {money(purchase.creatorEarningsMinor)}
                        </p>
                        {purchase.paidAt && (
                          <p className="text-[11px] text-ink-subtle">
                            <TimeAgo date={purchase.paidAt} locale={locale} />
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base">{t.creator.recentReviews}</h2>
                <Link
                  href={p("/dashboard/creator/reviews")}
                  className="text-[13px] font-semibold text-brand-600 hover:underline"
                >
                  {t.common.seeAll}
                </Link>
              </div>

              {overview.recentReviews.length === 0 ? (
                <p className="text-[13px] text-ink-subtle">{t.reviews.noReviews}</p>
              ) : (
                <ul className="space-y-3.5">
                  {overview.recentReviews.map((review) => (
                    <li key={review.id} className="border-b border-line pb-3.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Stars rating={review.rating} size={12} />
                        <span className="truncate text-[12px] text-ink-subtle">
                          {review.course.title}
                        </span>
                      </div>
                      {review.title && (
                        <p className="mt-1 text-[13px] font-semibold text-ink">{review.title}</p>
                      )}
                      {review.body && (
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-muted">
                          {review.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-ink-subtle">
                        {review.user.profile?.fullName ?? "—"} ·{" "}
                        <TimeAgo date={review.createdAt} locale={locale} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Course list */}
          <Card className="mt-4 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base">{t.creator.myCourses}</h2>
              <Link
                href={p("/dashboard/creator/courses")}
                className="text-[13px] font-semibold text-brand-600 hover:underline"
              >
                {t.common.seeAll}
              </Link>
            </div>

            <ul className="divide-y divide-line">
              {overview.courses.slice(0, 5).map((course) => (
                <li key={course.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={p(`/dashboard/creator/courses/${course.id}`)}
                      className="truncate text-[13px] font-semibold text-ink hover:text-brand-600"
                    >
                      {course.title}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-subtle">
                      <span>
                        {course.studentCount} {t.common.students}
                      </span>
                      <span>
                        {course.lessonCount} {t.common.lessons}
                      </span>
                      {course.ratingCount > 0 && <span>★ {course.ratingAvg.toFixed(1)}</span>}
                    </p>
                  </div>
                  <StatusBadge status={course.status} t={t} />
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
