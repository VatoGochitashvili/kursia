import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { PayoutActions } from "@/components/admin/PayoutActions";
import { Avatar, Badge, Card, EmptyState, Stat } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Payouts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  await requireAdmin();
  const { locale, t } = await getI18n();

  const [payouts, pendingAgg, paidAgg] = await Promise.all([
    db.payout.findMany({
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      take: 100,
      select: {
        id: true, reference: true, amountMinor: true, currency: true, status: true,
        requestedAt: true, processedAt: true, note: true, adminNote: true, providerRef: true,
        creator: {
          select: {
            id: true, slug: true, displayName: true, isVerified: true,
            user: { select: { email: true, profile: { select: { avatarUrl: true } } } },
          },
        },
        method: { select: { accountName: true, iban: true, bankName: true } },
      },
    }),
    db.payout.aggregate({
      where: { status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    db.payout.aggregate({ where: { status: "PAID" }, _sum: { amountMinor: true } }),
  ]);

  const currency = payouts[0]?.currency ?? "GEL";
  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <PageHeader title={t.admin.payouts} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label={locale === "en" ? "Awaiting transfer" : "გადასარიცხი"}
          value={formatMoney(pendingAgg._sum.amountMinor ?? 0, currency)}
          hint={`${pendingAgg._count._all} ${t.admin.payouts.toLowerCase()}`}
          icon={<Icon name="clock" size={17} />}
        />
        <Stat
          label={t.creator.paidOut}
          value={formatMoney(paidAgg._sum.amountMinor ?? 0, currency)}
          icon={<Icon name="check" size={17} />}
        />
        <Stat
          label={t.common.total}
          value={payouts.length}
          icon={<Icon name="bank" size={17} />}
        />
      </div>

      {payouts.length === 0 ? (
        <EmptyState icon={<Icon name="bank" size={30} />} title={t.admin.noPending} />
      ) : (
        <ul className="space-y-3">
          {payouts.map((payout) => (
            <li key={payout.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-ink">
                        {payout.reference}
                      </span>
                      <PayoutStatusBadge status={payout.status} locale={locale} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                      <span className="flex items-center gap-1.5">
                        <Avatar
                          src={payout.creator.user.profile?.avatarUrl}
                          name={payout.creator.displayName}
                          size={20}
                        />
                        <Link
                          href={p(`/creator/${payout.creator.slug}`)}
                          className="hover:text-brand-600"
                        >
                          {payout.creator.displayName}
                        </Link>
                      </span>
                      <span>{formatDateTime(payout.requestedAt, locale)}</span>
                    </div>

                    {/* Bank details are what the operator actually needs to act. */}
                    {payout.method && (
                      <dl className="mt-3 grid gap-1 rounded-lg bg-surface-muted p-3 text-[12px] sm:grid-cols-3">
                        <div>
                          <dt className="text-ink-subtle">
                            {locale === "en" ? "Account holder" : "მიმღები"}
                          </dt>
                          <dd className="font-medium text-ink">{payout.method.accountName}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-ink-subtle">IBAN</dt>
                          <dd className="font-mono font-medium text-ink" dir="ltr">
                            {payout.method.iban}
                          </dd>
                        </div>
                        {payout.method.bankName && (
                          <div>
                            <dt className="text-ink-subtle">
                              {locale === "en" ? "Bank" : "ბანკი"}
                            </dt>
                            <dd className="font-medium text-ink">{payout.method.bankName}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {payout.note && (
                      <p className="mt-2 text-[12px] text-ink-muted">{payout.note}</p>
                    )}
                    {payout.adminNote && (
                      <p className="mt-1 text-[12px] text-warn-700">{payout.adminNote}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-end">
                    <p className="text-xl font-bold tabular-nums text-ink">
                      {formatMoney(payout.amountMinor, payout.currency)}
                    </p>
                    <div className="mt-3">
                      <PayoutActions
                        payoutId={payout.id}
                        status={payout.status}
                        labels={{
                          approve: t.admin.approve,
                          reject: t.admin.reject,
                          processing: locale === "en" ? "Mark processing" : "დამუშავებაში",
                          paid: locale === "en" ? "Mark as paid" : "გადარიცხულად მონიშვნა",
                          failed: locale === "en" ? "Mark failed" : "წარუმატებელი",
                          providerRef:
                            locale === "en" ? "Bank reference" : "საბანკო დოკუმენტის ნომერი",
                          note: t.admin.reason,
                          submit: t.common.confirm,
                          cancel: t.common.cancel,
                        }}
                      />
                    </div>
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

function PayoutStatusBadge({ status, locale }: { status: string; locale: string }) {
  const tone =
    status === "PAID"
      ? "success"
      : status === "REJECTED" || status === "FAILED"
        ? "danger"
        : status === "PROCESSING" || status === "APPROVED"
          ? "brand"
          : "warn";
  const ka: Record<string, string> = {
    REQUESTED: "მოთხოვნილი",
    APPROVED: "დამტკიცებული",
    PROCESSING: "მუშავდება",
    PAID: "გადარიცხულია",
    REJECTED: "უარყოფილი",
    FAILED: "ვერ შესრულდა",
  };
  const en: Record<string, string> = {
    REQUESTED: "Requested",
    APPROVED: "Approved",
    PROCESSING: "Processing",
    PAID: "Paid",
    REJECTED: "Rejected",
    FAILED: "Failed",
  };
  return <Badge tone={tone}>{(locale === "en" ? en : ka)[status] ?? status}</Badge>;
}
