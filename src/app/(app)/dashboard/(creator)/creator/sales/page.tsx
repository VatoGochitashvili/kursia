import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Sales", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, t } = await getI18n();
  const creator = await requireCreator();
  const { page: pageParam } = await searchParams;

  const page = Math.max(Number(pageParam) || 1, 1);
  const perPage = 30;

  const [purchases, total, totals] = await Promise.all([
    db.purchase.findMany({
      where: { creatorId: creator.creatorId, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, reference: true, status: true, amountMinor: true,
        platformFeeMinor: true, creatorEarningsMinor: true, currency: true,
        commissionBps: true, paidAt: true, createdAt: true, refundedAmountMinor: true,
        course: { select: { title: true } },
        user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
      },
    }),
    db.purchase.count({ where: { creatorId: creator.creatorId, status: { not: "PENDING" } } }),
    db.purchase.aggregate({
      where: { creatorId: creator.creatorId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      _sum: { amountMinor: true, platformFeeMinor: true, creatorEarningsMinor: true },
    }),
  ]);

  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const currency = purchases[0]?.currency ?? "GEL";

  return (
    <>
      <PageHeader title={t.creator.sales} subtitle={`${total} ${t.creator.totalSales.toLowerCase()}`} />

      {/* The split, stated plainly — gross, fee, net. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label={t.creator.totalRevenue}
          value={formatMoney(totals._sum.amountMinor ?? 0, currency)}
          hint={locale === "en" ? "gross" : "ბრუტო"}
        />
        <SummaryTile
          label={t.creator.platformFee}
          value={`−${formatMoney(totals._sum.platformFeeMinor ?? 0, currency)}`}
          hint={locale === "en" ? "platform commission" : "პლატფორმის საკომისიო"}
          tone="muted"
        />
        <SummaryTile
          label={t.creator.earnings}
          value={formatMoney(totals._sum.creatorEarningsMinor ?? 0, currency)}
          hint={locale === "en" ? "your share" : "თქვენი წილი"}
          tone="brand"
        />
      </div>

      {purchases.length === 0 ? (
        <EmptyState icon={<Icon name="creditCard" size={30} />} title={t.common.empty} />
      ) : (
        <Card className="overflow-hidden">
          {/* Table on desktop; the same data as stacked cards on mobile. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[13px]">
              <thead className="border-b border-line bg-surface-muted text-[12px] text-ink-muted">
                <tr>
                  <Th>{t.common.date}</Th>
                  <Th>{t.creator.students}</Th>
                  <Th>{t.nav.courses}</Th>
                  <Th align="end">{t.checkout.total}</Th>
                  <Th align="end">{t.creator.platformFee}</Th>
                  <Th align="end">{t.creator.earnings}</Th>
                  <Th align="end">{t.common.status}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-surface-muted/60">
                    <Td className="whitespace-nowrap text-ink-muted">
                      {formatDateTime(purchase.paidAt ?? purchase.createdAt, locale)}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar
                          src={purchase.user.profile?.avatarUrl}
                          name={purchase.user.profile?.fullName ?? "?"}
                          size={26}
                        />
                        <span className="truncate">{purchase.user.profile?.fullName ?? "—"}</span>
                      </span>
                    </Td>
                    <Td className="max-w-[16rem] truncate">{purchase.course.title}</Td>
                    <Td align="end" className="tabular-nums">
                      {formatMoney(purchase.amountMinor, purchase.currency)}
                    </Td>
                    <Td align="end" className="tabular-nums text-ink-subtle">
                      −{formatMoney(purchase.platformFeeMinor, purchase.currency)}
                      <span className="ms-1 text-[11px]">({purchase.commissionBps / 100}%)</span>
                    </Td>
                    <Td align="end" className="font-semibold tabular-nums">
                      {formatMoney(purchase.creatorEarningsMinor, purchase.currency)}
                    </Td>
                    <Td align="end">
                      <StatusPill status={purchase.status} locale={locale} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {purchases.map((purchase) => (
              <li key={purchase.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {purchase.course.title}
                    </p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {purchase.user.profile?.fullName ?? "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-subtle">
                      {formatDateTime(purchase.paidAt ?? purchase.createdAt, locale)}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-[15px] font-bold tabular-nums text-ink">
                      {formatMoney(purchase.creatorEarningsMinor, purchase.currency)}
                    </p>
                    <p className="text-[11px] text-ink-subtle">
                      {formatMoney(purchase.amountMinor, purchase.currency)} −
                      {formatMoney(purchase.platformFeeMinor, purchase.currency)}
                    </p>
                    <div className="mt-1.5">
                      <StatusPill status={purchase.status} locale={locale} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }).slice(0, 12).map((_, i) => (
            <a
              key={i}
              href={`?page=${i + 1}`}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-[13px] font-semibold ${
                i + 1 === page
                  ? "bg-brand-600 text-white"
                  : "border border-line-strong text-ink-muted hover:bg-surface-muted"
              }`}
            >
              {i + 1}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "muted" | "brand";
}) {
  return (
    <Card
      className={`p-5 ${tone === "brand" ? "border-brand-200 bg-brand-50/50" : ""}`}
    >
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${
          tone === "muted" ? "text-ink-muted" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>
    </Card>
  );
}

function StatusPill({ status, locale }: { status: string; locale: string }) {
  const tone =
    status === "PAID"
      ? "success"
      : status === "REFUNDED" || status === "PARTIALLY_REFUNDED"
        ? "warn"
        : "neutral";
  const ka: Record<string, string> = {
    PAID: "გადახდილი",
    FAILED: "ვერ შესრულდა",
    CANCELLED: "გაუქმებული",
    REFUNDED: "დაბრუნებული",
    PARTIALLY_REFUNDED: "ნაწ. დაბრუნება",
  };
  const en: Record<string, string> = {
    PAID: "Paid",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Part. refunded",
  };
  return <Badge tone={tone}>{(locale === "en" ? en : ka)[status] ?? status}</Badge>;
}

function Th({ children, align }: { children: React.ReactNode; align?: "end" }) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${align === "end" ? "text-end" : "text-start"}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className = "",
}: {
  children: React.ReactNode;
  align?: "end";
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 ${align === "end" ? "text-end" : "text-start"} ${className}`}>
      {children}
    </td>
  );
}
