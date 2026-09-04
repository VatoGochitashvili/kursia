import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/rbac";
import { getPlatformOverview } from "@/lib/admin-analytics";
import { formatMoney } from "@/lib/money";
import { formatCount } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { RevenueChart, SalesBarChart } from "@/components/charts/Charts";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, Card, Stat } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { TimeAgo } from "@/components/ui/TimeAgo";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [{ locale, t }, settings, overview] = await Promise.all([
    getI18n(),
    getSettings(),
    getPlatformOverview(30),
  ]);

  const p = (path: string) => localePath(path, locale);
  const money = (minor: number) =>
    formatMoney(minor, settings.currency, { hideDecimalsWhenWhole: true });

  return (
    <>
      <PageHeader
        title={t.admin.overview}
        subtitle={locale === "en" ? settings.platformName : settings.platformNameKa}
      />

      {/* Anything needing a human decision surfaces first. */}
      {(overview.pendingCourses > 0 || overview.pendingPayoutCount > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {overview.pendingCourses > 0 && (
            <Alert tone="warn" title={t.admin.pendingCourses}>
              <div className="flex items-center justify-between gap-3">
                <span>
                  {overview.pendingCourses} {t.nav.courses.toLowerCase()}
                </span>
                <ButtonLink href={p("/admin/courses?status=SUBMITTED")} size="sm" variant="outline">
                  {t.common.open}
                </ButtonLink>
              </div>
            </Alert>
          )}
          {overview.pendingPayoutCount > 0 && (
            <Alert tone="brand" title={t.admin.payouts}>
              <div className="flex items-center justify-between gap-3">
                <span>
                  {overview.pendingPayoutCount} · {money(overview.pendingPayoutMinor)}
                </span>
                <ButtonLink href={p("/admin/payouts")} size="sm" variant="outline">
                  {t.common.open}
                </ButtonLink>
              </div>
            </Alert>
          )}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.admin.platformEarnings}
          value={money(overview.platformEarningsMinor)}
          hint={`${locale === "en" ? "this month" : "ამ თვეში"}: ${money(overview.monthPlatformMinor)}`}
          icon={<Icon name="wallet" size={17} />}
        />
        <Stat
          label={t.admin.grossVolume}
          value={money(overview.grossVolumeMinor)}
          hint={`${overview.totalSales} ${t.creator.totalSales.toLowerCase()}`}
          icon={<Icon name="chart" size={17} />}
        />
        <Stat
          label={t.creator.earnings}
          value={money(overview.creatorEarningsMinor)}
          hint={locale === "en" ? "owed to creators" : "ინსტრუქტორების წილი"}
          icon={<Icon name="users" size={17} />}
        />
        <Stat
          label={t.admin.refunds}
          value={money(overview.refundedMinor)}
          hint={`${overview.refundCount} ${t.admin.refunds.toLowerCase()}`}
          icon={<Icon name="refresh" size={17} />}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.admin.totalUsers}
          value={formatCount(overview.users, locale)}
          hint={`${overview.students} ${t.admin.totalStudents} · ${overview.creators} ${t.admin.totalCreators}`}
          icon={<Icon name="users" size={17} />}
        />
        <Stat
          label={t.admin.courses}
          value={overview.courses}
          hint={`${overview.publishedCourses} ${t.admin.publishedCourses}`}
          icon={<Icon name="video" size={17} />}
        />
        <Stat
          label={t.admin.pendingCourses}
          value={overview.pendingCourses}
          icon={<Icon name="alert" size={17} />}
        />
        <Stat
          label={t.creator.paidOut}
          value={money(overview.paidPayoutMinor)}
          icon={<Icon name="bank" size={17} />}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <RevenueChart
            data={overview.series}
            currency={settings.currency}
            locale={locale}
            title={
              locale === "en"
                ? "Platform earnings — last 30 days"
                : "პლატფორმის შემოსავალი — ბოლო 30 დღე"
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base">{t.creator.recentPurchases}</h2>
            <Link
              href={p("/admin/transactions")}
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
                    size={30}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{purchase.course.title}</p>
                    <p className="truncate text-[11px] text-ink-subtle">
                      {purchase.user.profile?.fullName ?? "—"}
                      {purchase.paidAt && (
                        <>
                          {" · "}
                          <TimeAgo date={purchase.paidAt} locale={locale} />
                        </>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-[13px] font-semibold tabular-nums text-ink">
                      {formatMoney(purchase.amountMinor, purchase.currency)}
                    </p>
                    <p className="text-[11px] text-success-700">
                      +{formatMoney(purchase.platformFeeMinor, purchase.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base">{t.home.popularTitle}</h2>
          {overview.topCourses.length === 0 ? (
            <p className="text-[13px] text-ink-subtle">{t.common.empty}</p>
          ) : (
            <ul className="space-y-2.5">
              {overview.topCourses.map((course, index) => (
                <li key={course.id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-[13px] font-bold tabular-nums text-ink-subtle">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={p(`/courses/${course.slug}`)}
                      className="truncate text-[13px] font-medium text-ink hover:text-brand-600"
                    >
                      {course.title}
                    </Link>
                    <p className="truncate text-[11px] text-ink-subtle">
                      {course.creator.displayName}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] tabular-nums text-ink-muted">
                    {formatCount(course.studentCount, locale)} {t.common.students}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
