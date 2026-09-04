import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { RefundActions } from "@/components/admin/RefundActions";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Refunds", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  await requireAdmin();
  const { locale, t } = await getI18n();

  const refunds = await db.refund.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true, amountMinor: true, currency: true, reason: true, status: true,
      createdAt: true, processedAt: true, revokeAccess: true,
      purchase: {
        select: {
          reference: true, amountMinor: true, refundedAmountMinor: true, paidAt: true,
          course: { select: { title: true, slug: true } },
          user: { select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        },
      },
    },
  });

  const p = (path: string) => localePath(path, locale);
  const openRefunds = refunds.filter((r) => r.status === "REQUESTED");

  return (
    <>
      <PageHeader
        title={t.admin.refunds}
        subtitle={`${openRefunds.length} ${locale === "en" ? "awaiting decision" : "განსახილველი"}`}
      />

      {refunds.length === 0 ? (
        <EmptyState icon={<Icon name="refresh" size={30} />} title={t.admin.noPending} />
      ) : (
        <ul className="space-y-3">
          {refunds.map((refund) => (
            <li key={refund.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={p(`/courses/${refund.purchase.course.slug}`)}
                        className="text-[14px] font-bold text-ink hover:text-brand-600"
                      >
                        {refund.purchase.course.title}
                      </Link>
                      <RefundStatusBadge status={refund.status} locale={locale} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                      <span className="flex items-center gap-1.5">
                        <Avatar
                          src={refund.purchase.user.profile?.avatarUrl}
                          name={refund.purchase.user.profile?.fullName ?? "?"}
                          size={20}
                        />
                        {refund.purchase.user.profile?.fullName ?? refund.purchase.user.email}
                      </span>
                      <span className="font-mono">{refund.purchase.reference}</span>
                      <span>{formatDateTime(refund.createdAt, locale)}</span>
                    </div>

                    {refund.reason && (
                      <p className="mt-2.5 rounded-lg bg-surface-muted px-3 py-2 text-[12px] text-ink-muted">
                        <span className="font-semibold">{t.admin.reason}: </span>
                        {refund.reason}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-end">
                    <p className="text-lg font-bold tabular-nums text-ink">
                      {formatMoney(refund.amountMinor, refund.currency)}
                    </p>
                    <p className="text-[11px] text-ink-subtle">
                      {locale === "en" ? "of" : "სულ"}{" "}
                      {formatMoney(refund.purchase.amountMinor, refund.currency)}
                    </p>

                    {refund.status === "REQUESTED" && (
                      <div className="mt-3">
                        <RefundActions
                          refundId={refund.id}
                          maxAmount={
                            (refund.purchase.amountMinor - refund.purchase.refundedAmountMinor) / 100
                          }
                          defaultAmount={refund.amountMinor / 100}
                          currency={refund.currency}
                          labels={{
                            approve: t.admin.approve,
                            reject: t.admin.reject,
                            amount: locale === "en" ? "Refund amount" : "დასაბრუნებელი თანხა",
                            revokeAccess:
                              locale === "en" ? "Revoke course access" : "წვდომის გაუქმება",
                            note: t.admin.reason,
                            submit: t.common.confirm,
                            cancel: t.common.cancel,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RefundStatusBadge({ status, locale }: { status: string; locale: string }) {
  const tone =
    status === "PROCESSED"
      ? "success"
      : status === "REJECTED" || status === "FAILED"
        ? "danger"
        : "warn";
  const ka: Record<string, string> = {
    REQUESTED: "მოთხოვნილი",
    APPROVED: "დამტკიცებული",
    PROCESSED: "დამუშავებული",
    REJECTED: "უარყოფილი",
    FAILED: "ვერ შესრულდა",
  };
  const en: Record<string, string> = {
    REQUESTED: "Requested",
    APPROVED: "Approved",
    PROCESSED: "Processed",
    REJECTED: "Rejected",
    FAILED: "Failed",
  };
  return <Badge tone={tone}>{(locale === "en" ? en : ka)[status] ?? status}</Badge>;
}
