import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { RefundRequestButton } from "@/components/dashboard/RefundRequestButton";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { getSettings } from "@/lib/settings";
import { communityLabel } from "@/lib/membership";

export const metadata: Metadata = { title: "Purchases", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_TONE = {
  PAID: "success",
  PENDING: "warn",
  FAILED: "danger",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "warn",
} as const;

export default async function PurchasesPage() {
  const [{ locale, t }, settings, user] = await Promise.all([
    getI18n(),
    getSettings(),
    requireUser(),
  ]);

  const purchases = await db.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, reference: true, status: true, amountMinor: true, currency: true,
      createdAt: true, paidAt: true, refundedAmountMinor: true,
      creatorId: true,
      course: { select: { slug: true, title: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true } },
      refunds: { select: { id: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Membership purchases have no course to name. Purchase stores creatorId as
  // a plain column rather than a relation, so the communities behind them are
  // fetched in one go here instead of per row.
  const membershipCreatorIds = [
    ...new Set(purchases.filter((x) => !x.course).map((x) => x.creatorId)),
  ];
  const creators = membershipCreatorIds.length
    ? await db.creatorProfile.findMany({
        where: { id: { in: membershipCreatorIds } },
        select: { id: true, slug: true, displayName: true, communityName: true },
      })
    : [];
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  const p = (path: string) => localePath(path, locale);
  const refundWindowMs = settings.refundWindowDays * 24 * 60 * 60 * 1000;

  return (
    <>
      <PageHeader title={t.dashboard.purchaseHistory} subtitle={t.nav.purchases} />

      {purchases.length === 0 ? (
        <EmptyState
          icon={<Icon name="creditCard" size={30} />}
          title={t.common.empty}
          action={
            <ButtonLink href={p("/courses")}>{t.dashboard.browseCourses}</ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {purchases.map((purchase) => {
            const status = purchase.status as keyof typeof STATUS_TONE;
            const withinWindow =
              purchase.status === "PAID" &&
              purchase.paidAt !== null &&
              Date.now() - purchase.paidAt.getTime() < refundWindowMs;
            const pendingRefund = purchase.refunds[0]?.status === "REQUESTED";

            // One row, two kinds of thing bought.
            const creator = purchase.course ? null : creatorById.get(purchase.creatorId);
            const title = purchase.course?.title ?? communityLabel(creator, locale);
            const href = purchase.course
              ? `/courses/${purchase.course.slug}`
              : creator
                ? `/community/${creator.slug}`
                : "/dashboard/purchases";
            const openHref = purchase.course
              ? `/learn/${purchase.course.slug}`
              : creator
                ? `/community/${creator.slug}`
                : null;

            return (
              <li key={purchase.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={p(href)}
                        className="text-[15px] font-bold text-ink hover:text-brand-600"
                      >
                        {title}
                      </Link>
                      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-muted">
                        <div className="flex gap-1.5">
                          <dt>{t.checkout.reference}:</dt>
                          <dd className="font-mono text-ink">{purchase.reference}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt>{t.common.date}:</dt>
                          <dd>{formatDateTime(purchase.paidAt ?? purchase.createdAt, locale)}</dd>
                        </div>
                        {purchase.transactions[0] && (
                          <div className="flex gap-1.5">
                            <dt>{t.checkout.paymentMethod}:</dt>
                            <dd>{purchase.transactions[0].provider}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-lg font-bold tabular-nums text-ink">
                        {formatMoney(purchase.amountMinor, purchase.currency, {
                          freeLabel: t.common.free,
                        })}
                      </span>
                      <Badge tone={STATUS_TONE[status] ?? "neutral"}>
                        {statusLabel(status, locale)}
                      </Badge>
                      {purchase.refundedAmountMinor > 0 && (
                        <span className="text-[11px] text-ink-subtle">
                          −{formatMoney(purchase.refundedAmountMinor, purchase.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    {purchase.status === "PAID" && openHref && (
                      <ButtonLink href={p(openHref)} size="sm">
                        <Icon name={purchase.course ? "play" : "users"} size={14} filled />
                        {purchase.course ? t.courses.continueLearning : t.community.title}
                      </ButtonLink>
                    )}
                    {purchase.status === "PENDING" && (
                      <ButtonLink
                        href={p(`/checkout/${purchase.reference}/complete`)}
                        size="sm"
                        variant="outline"
                      >
                        {t.checkout.pendingTitle}
                      </ButtonLink>
                    )}
                    {withinWindow && !pendingRefund && (
                      <RefundRequestButton
                        purchaseId={purchase.id}
                        labels={{
                          request: locale === "en" ? "Request a refund" : "თანხის დაბრუნება",
                          reason: t.admin.reason,
                          submit: t.common.submit,
                          cancel: t.common.cancel,
                          sent:
                            locale === "en"
                              ? "Your refund request has been submitted."
                              : "დაბრუნების მოთხოვნა გაიგზავნა.",
                          hint:
                            locale === "en"
                              ? "Tell us briefly what went wrong (at least 10 characters)."
                              : "მოკლედ აღწერეთ მიზეზი (მინიმუმ 10 სიმბოლო).",
                        }}
                      />
                    )}
                    {pendingRefund && (
                      <span className="text-[12px] font-medium text-warn-700">
                        {locale === "en" ? "Refund requested" : "დაბრუნება მოთხოვნილია"}
                      </span>
                    )}
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

function statusLabel(status: string, locale: string): string {
  const ka: Record<string, string> = {
    PAID: "გადახდილი",
    PENDING: "მოლოდინში",
    FAILED: "ვერ შესრულდა",
    CANCELLED: "გაუქმებული",
    REFUNDED: "დაბრუნებული",
    PARTIALLY_REFUNDED: "ნაწილობრივ დაბრუნებული",
  };
  const en: Record<string, string> = {
    PAID: "Paid",
    PENDING: "Pending",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially refunded",
  };
  return (locale === "en" ? en : ka)[status] ?? status;
}
