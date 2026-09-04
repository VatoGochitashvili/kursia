import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { getPurchaseForViewer } from "@/lib/checkout-view";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PendingWatcher } from "@/components/checkout/PendingWatcher";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Post-payment screen.
 *
 * The outcome shown here comes from the database, never from the URL. Landing
 * on /complete without a settled webhook shows "processing", and the page
 * polls until the server says otherwise.
 */
export default async function CheckoutCompletePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { locale, t } = await getI18n();
  const { reference } = await params;
  const user = await requireUser();
  const purchase = await getPurchaseForViewer(reference, user.id);

  const p = (path: string) => localePath(path, locale);
  const paid = purchase.status === "PAID";
  const failed = purchase.status === "FAILED" || purchase.status === "CANCELLED";
  const hasAccess = Boolean(purchase.enrollment && !purchase.enrollment.revokedAt);

  return (
    <div className="container-page flex min-h-[70dvh] items-center justify-center py-14">
      <Card className="w-full max-w-lg p-8 text-center">
        <span
          className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl ${
            paid
              ? "bg-success-50 text-success-700"
              : failed
                ? "bg-danger-50 text-danger-700"
                : "bg-warn-50 text-warn-700"
          }`}
        >
          {paid ? (
            <Icon name="check" size={30} />
          ) : failed ? (
            <Icon name="close" size={30} />
          ) : (
            <Spinner className="h-7 w-7" />
          )}
        </span>

        <h1 className="mt-5 text-2xl">
          {paid ? t.checkout.successTitle : failed ? t.checkout.failedTitle : t.checkout.pendingTitle}
        </h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          {paid ? t.checkout.successBody : failed ? t.checkout.failedBody : t.checkout.pendingBody}
        </p>

        <dl className="mt-6 space-y-2.5 rounded-xl bg-surface-muted p-4 text-left text-sm">
          <Row label={t.nav.courses} value={purchase.course.title} />
          <Row label={t.checkout.reference} value={purchase.reference} mono />
          <Row
            label={t.checkout.total}
            value={formatMoney(purchase.amountMinor, purchase.currency, {
              freeLabel: t.common.free,
            })}
          />
          <Row
            label={t.common.date}
            value={formatDateTime(purchase.paidAt ?? purchase.createdAt, locale)}
          />
        </dl>

        <div className="mt-7 space-y-2.5">
          {paid && hasAccess ? (
            <ButtonLink href={p(`/learn/${purchase.course.slug}`)} size="lg" fullWidth>
              <Icon name="play" size={17} filled />
              {t.checkout.startLearning}
            </ButtonLink>
          ) : failed ? (
            <ButtonLink href={p(`/courses/${purchase.course.slug}`)} size="lg" fullWidth>
              {t.checkout.tryAgain}
            </ButtonLink>
          ) : null}

          <ButtonLink href={p("/dashboard/purchases")} variant="outline" size="lg" fullWidth>
            {t.dashboard.purchaseHistory}
          </ButtonLink>
        </div>

        {!paid && !failed && <PendingWatcher reference={purchase.reference} />}
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className={`text-right font-medium text-ink ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
