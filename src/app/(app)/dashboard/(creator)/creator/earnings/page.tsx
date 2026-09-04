import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSettings, resolveCommissionBps } from "@/lib/settings";
import { requireCreator } from "@/lib/auth/rbac";
import { getBalanceSummary } from "@/lib/earnings";
import { getCourseAnalytics } from "@/lib/creator-analytics";
import { formatMoney, bpsToPercent } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { RankedBars } from "@/components/charts/Charts";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Card, Stat } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Earnings", robots: { index: false } };
export const dynamic = "force-dynamic";

const ENTRY_LABELS_KA: Record<string, string> = {
  SALE: "გაყიდვა",
  PLATFORM_FEE: "პლატფორმის საკომისიო",
  PROCESSING_FEE: "დამუშავების საკომისიო",
  REFUND: "დაბრუნება",
  CLEARED: "გახდა ხელმისაწვდომი",
  PAYOUT: "გატანა",
  ADJUSTMENT: "კორექტირება",
};

export default async function EarningsPage() {
  const [{ locale, t }, settings, creator] = await Promise.all([
    getI18n(),
    getSettings(),
    requireCreator(),
  ]);

  const [balance, entries, courses, commissionBps] = await Promise.all([
    getBalanceSummary(creator.creatorId),
    db.balanceEntry.findMany({
      where: { creatorId: creator.creatorId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, type: true, amountMinor: true, currency: true,
        description: true, createdAt: true, availableAt: true,
      },
    }),
    getCourseAnalytics(creator.creatorId),
    resolveCommissionBps(creator.creatorId),
  ]);

  const p = (path: string) => localePath(path, locale);
  const money = (minor: number) => formatMoney(minor, balance.currency);

  return (
    <>
      <PageHeader
        title={t.creator.earnings}
        subtitle={`${t.creator.platformFee}: ${bpsToPercent(commissionBps)}%`}
        action={
          <ButtonLink href={p("/dashboard/creator/payouts")}>
            <Icon name="bank" size={16} />
            {t.creator.requestPayout}
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.creator.availableBalance}
          value={money(balance.withdrawableMinor)}
          hint={
            balance.reservedMinor > 0
              ? `${locale === "en" ? "reserved" : "დაჯავშნილი"}: ${money(balance.reservedMinor)}`
              : undefined
          }
          icon={<Icon name="wallet" size={17} />}
        />
        <Stat
          label={t.creator.pendingBalance}
          value={money(balance.pendingMinor)}
          hint={`${settings.payoutClearingDays} ${locale === "en" ? "day clearing" : "დღე"}`}
          icon={<Icon name="clock" size={17} />}
        />
        <Stat
          label={t.creator.paidOut}
          value={money(balance.paidOutMinor)}
          icon={<Icon name="bank" size={17} />}
        />
        <Stat
          label={t.creator.totalRevenue}
          value={money(balance.grossSalesMinor)}
          hint={`${locale === "en" ? "gross" : "ბრუტო"}`}
          icon={<Icon name="chart" size={17} />}
        />
      </div>

      {/* How a sale is split — the same arithmetic the ledger uses. */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-base">
          {locale === "en" ? "How your earnings are calculated" : "როგორ ითვლება შემოსავალი"}
        </h2>
        <dl className="space-y-2 text-[13px]">
          <Row label={locale === "en" ? "Gross sales" : "ბრუტო გაყიდვები"} value={money(balance.grossSalesMinor)} />
          <Row
            label={`${t.creator.platformFee} (${bpsToPercent(commissionBps)}%)`}
            value={`−${money(balance.platformFeeMinor)}`}
            muted
          />
          {balance.processingFeeMinor > 0 && (
            <Row
              label={locale === "en" ? "Processing fees" : "დამუშავების საკომისიო"}
              value={`−${money(balance.processingFeeMinor)}`}
              muted
            />
          )}
          {balance.refundedMinor > 0 && (
            <Row
              label={locale === "en" ? "Refunds" : "დაბრუნებები"}
              value={`−${money(balance.refundedMinor)}`}
              muted
            />
          )}
          <div className="border-t border-line pt-2">
            <Row
              label={locale === "en" ? "Net earnings" : "წმინდა შემოსავალი"}
              value={money(balance.netEarningsMinor)}
              strong
            />
          </div>
        </dl>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <RankedBars
            title={locale === "en" ? "Earnings by course" : "შემოსავალი კურსების მიხედვით"}
            currency={balance.currency}
            locale={locale}
            emptyLabel={t.common.empty}
            rows={courses
              .filter((c) => c.revenueMinor > 0)
              .slice(0, 8)
              .map((c) => ({ label: c.title, value: c.revenueMinor }))}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-[13px] font-semibold text-ink">
            {locale === "en" ? "Ledger" : "ოპერაციები"}
          </h2>
          {entries.length === 0 ? (
            <p className="text-[13px] text-ink-subtle">{t.common.empty}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink">
                      {entry.description ??
                        (locale === "en"
                          ? entry.type
                          : (ENTRY_LABELS_KA[entry.type] ?? entry.type))}
                    </p>
                    <p className="text-[11px] text-ink-subtle">
                      {formatDate(entry.createdAt, locale)}
                      {entry.availableAt && (
                        <>
                          {" · "}
                          {locale === "en" ? "available" : "ხელმისაწვდომი"}{" "}
                          {formatDate(entry.availableAt, locale)}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                      entry.amountMinor < 0 ? "text-danger-700" : "text-success-700"
                    }`}
                  >
                    {entry.amountMinor < 0 ? "−" : "+"}
                    {formatMoney(Math.abs(entry.amountMinor), entry.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {balance.pendingMinor > 0 && (
        <Alert tone="brand">
          {locale === "en"
            ? `Sales stay pending for ${settings.payoutClearingDays} days (the refund window) before becoming withdrawable.`
            : `გაყიდვის თანხა ${settings.payoutClearingDays} დღე რჩება მოლოდინში (დაბრუნების ვადა), შემდეგ ხდება გასატანად ხელმისაწვდომი.`}
        </Alert>
      )}
    </>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-ink-subtle" : "text-ink-muted"}>{label}</dt>
      <dd
        className={`tabular-nums ${
          strong ? "text-base font-bold text-ink" : muted ? "text-ink-subtle" : "font-semibold text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
