import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { requireCreator } from "@/lib/auth/rbac";
import { getBalanceSummary } from "@/lib/earnings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { PayoutPanel } from "@/components/creator/PayoutPanel";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Payouts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const [{ locale, t }, settings, creator] = await Promise.all([
    getI18n(),
    getSettings(),
    requireCreator(),
  ]);

  const [balance, methods, payouts] = await Promise.all([
    getBalanceSummary(creator.creatorId),
    db.payoutMethod.findMany({
      where: { creatorId: creator.creatorId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, accountName: true, iban: true, bankName: true,
        isDefault: true, verifiedAt: true,
      },
    }),
    db.payout.findMany({
      where: { creatorId: creator.creatorId },
      orderBy: { requestedAt: "desc" },
      select: {
        id: true, reference: true, amountMinor: true, currency: true, status: true,
        requestedAt: true, processedAt: true, adminNote: true,
        method: { select: { iban: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={t.creator.payouts}
        subtitle={`${t.creator.minimumPayout.replace(
          "{amount}",
          formatMoney(settings.payoutMinimumMinor, balance.currency),
        )}`}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {payouts.length === 0 ? (
            <EmptyState
              icon={<Icon name="bank" size={30} />}
              title={t.creator.payoutHistory}
              body={t.common.empty}
            />
          ) : (
            <Card className="overflow-hidden">
              <h2 className="border-b border-line px-5 py-3.5 text-base font-bold">
                {t.creator.payoutHistory}
              </h2>
              <ul className="divide-y divide-line">
                {payouts.map((payout) => (
                  <li key={payout.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-ink">
                        {payout.reference}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-muted">
                        {formatDate(payout.requestedAt, locale)}
                        {payout.method?.iban && ` · ${maskIban(payout.method.iban)}`}
                      </p>
                      {payout.adminNote && (
                        <p className="mt-1 text-[12px] text-warn-700">{payout.adminNote}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-[15px] font-bold tabular-nums text-ink">
                        {formatMoney(payout.amountMinor, payout.currency)}
                      </p>
                      <div className="mt-1">
                        <PayoutStatus status={payout.status} locale={locale} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <PayoutPanel
          balance={{
            withdrawableMinor: balance.withdrawableMinor,
            pendingMinor: balance.pendingMinor,
            reservedMinor: balance.reservedMinor,
            currency: balance.currency,
            minimumMinor: settings.payoutMinimumMinor,
          }}
          methods={methods}
          locale={locale}
          labels={{
            available: t.creator.availableBalance,
            pending: t.creator.pendingBalance,
            reserved: locale === "en" ? "Reserved" : "დაჯავშნილი",
            request: t.creator.requestPayout,
            amount: locale === "en" ? "Amount" : "თანხა",
            note: locale === "en" ? "Note (optional)" : "შენიშვნა (არასავალდებულო)",
            paymentInfo: t.creator.paymentInfo,
            noMethod: t.creator.noPayoutMethod,
            accountName: locale === "en" ? "Account holder" : "მიმღების სახელი",
            iban: "IBAN",
            bankName: locale === "en" ? "Bank" : "ბანკი",
            addMethod: locale === "en" ? "Add bank account" : "ანგარიშის დამატება",
            save: t.common.save,
            cancel: t.common.cancel,
            minimum: t.creator.minimumPayout.replace(
              "{amount}",
              formatMoney(settings.payoutMinimumMinor, balance.currency),
            ),
            submitted:
              locale === "en"
                ? "Payout requested. We'll process it shortly."
                : "გატანის მოთხოვნა გაიგზავნა. დამუშავდება უმოკლეს ვადაში.",
          }}
        />
      </div>
    </>
  );
}

/** Never render a full IBAN in a list view. */
function maskIban(iban: string): string {
  return iban.length > 8 ? `${iban.slice(0, 6)}••••${iban.slice(-4)}` : iban;
}

function PayoutStatus({ status, locale }: { status: string; locale: string }) {
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
