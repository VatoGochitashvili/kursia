import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Transactions", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; page?: string }>;
}) {
  await requireAdmin();
  const { locale, t } = await getI18n();
  const { status, provider, page: pageParam } = await searchParams;

  const page = Math.max(Number(pageParam) || 1, 1);
  const perPage = 40;

  const where = {
    ...(status ? { status } : {}),
    ...(provider ? { transactions: { some: { provider } } } : {}),
  };

  const [purchases, total, webhookFailures] = await Promise.all([
    db.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, reference: true, status: true, amountMinor: true,
        platformFeeMinor: true, creatorEarningsMinor: true, currency: true,
        createdAt: true, paidAt: true, refundedAmountMinor: true,
        course: { select: { title: true, slug: true } },
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { provider: true, status: true, providerOrderId: true, failureMessage: true },
        },
      },
    }),
    db.purchase.count({ where }),
    // Rejected callbacks are an operational signal: usually a mis-set
    // signature key, occasionally someone probing the endpoint.
    db.webhookEvent.count({ where: { signatureOk: false } }),
  ]);

  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const p = (path: string) => localePath(path, locale);

  const statusFilters = ["", "PAID", "PENDING", "FAILED", "REFUNDED"];

  return (
    <>
      <PageHeader title={t.admin.transactions} subtitle={`${total}`} />

      {webhookFailures > 0 && (
        <Card className="mb-5 border-warn-500/30 bg-warn-50 p-4">
          <p className="flex items-center gap-2 text-[13px] text-warn-700">
            <Icon name="alert" size={16} />
            {locale === "en"
              ? `${webhookFailures} webhook callbacks were rejected (signature verification failed). Check your provider credentials.`
              : `${webhookFailures} webhook გამოძახება უარყოფილია (ხელმოწერა ვერ დადასტურდა). შეამოწმეთ პროვაიდერის კონფიგურაცია.`}
          </p>
        </Card>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5">
        {statusFilters.map((value) => (
          <Link
            key={value}
            href={value ? `?status=${value}` : "?"}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
              (status ?? "") === value
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-line-strong text-ink-muted hover:bg-surface-muted",
            )}
          >
            {value || t.common.all}
          </Link>
        ))}
      </div>

      {purchases.length === 0 ? (
        <EmptyState icon={<Icon name="creditCard" size={30} />} title={t.common.empty} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-line bg-surface-muted text-[12px] text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-start font-semibold">
                    {t.checkout.reference}
                  </th>
                  <th className="px-4 py-2.5 text-start font-semibold">{t.common.date}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{t.admin.users}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{t.nav.courses}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">
                    {t.checkout.paymentMethod}
                  </th>
                  <th className="px-4 py-2.5 text-end font-semibold">{t.checkout.total}</th>
                  <th className="px-4 py-2.5 text-end font-semibold">
                    {t.admin.platformEarnings}
                  </th>
                  <th className="px-4 py-2.5 text-end font-semibold">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3 font-mono text-[12px]">{purchase.reference}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {formatDateTime(purchase.paidAt ?? purchase.createdAt, locale)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3">
                      {purchase.user.profile?.fullName ?? purchase.user.email}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3">
                      <Link
                        href={p(`/courses/${purchase.course.slug}`)}
                        className="hover:text-brand-600"
                      >
                        {purchase.course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {purchase.transactions[0]?.provider ?? "—"}
                      {purchase.transactions[0]?.failureMessage && (
                        <span
                          className="ms-1 text-danger-700"
                          title={purchase.transactions[0].failureMessage}
                        >
                          <Icon name="alert" size={12} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums">
                      {formatMoney(purchase.amountMinor, purchase.currency)}
                      {purchase.refundedAmountMinor > 0 && (
                        <span className="block text-[11px] text-danger-700">
                          −{formatMoney(purchase.refundedAmountMinor, purchase.currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold tabular-nums text-success-700">
                      {purchase.status === "PAID"
                        ? formatMoney(purchase.platformFeeMinor, purchase.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Badge
                        tone={
                          purchase.status === "PAID"
                            ? "success"
                            : purchase.status === "PENDING"
                              ? "warn"
                              : purchase.status === "FAILED"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {purchase.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 15) }).map((_, i) => (
            <Link
              key={i}
              href={`?page=${i + 1}${status ? `&status=${status}` : ""}`}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-[13px] font-semibold",
                i + 1 === page
                  ? "bg-brand-600 text-white"
                  : "border border-line-strong text-ink-muted hover:bg-surface-muted",
              )}
            >
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
