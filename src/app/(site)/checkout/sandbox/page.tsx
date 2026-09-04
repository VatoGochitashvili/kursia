import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { env, isProd } from "@/lib/env";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { SandboxTerminal } from "@/components/checkout/SandboxTerminal";

export const metadata: Metadata = { title: "Sandbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Simulated acquirer page. Unreachable in production. */
export default async function SandboxCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; ref?: string }>;
}) {
  if (isProd || !env.PAYMENT_SANDBOX_ENABLED) notFound();

  const { locale, t } = await getI18n();
  const { order, ref } = await searchParams;
  const user = await requireUser();

  if (!order || !ref) notFound();

  const transaction = await db.transaction.findFirst({
    where: { provider: "sandbox", providerOrderId: order, userId: user.id },
    select: {
      amountMinor: true,
      currency: true,
      status: true,
      course: { select: { title: true } },
      purchase: { select: { reference: true, status: true } },
    },
  });
  if (!transaction) notFound();

  return (
    <div className="container-page flex min-h-[70dvh] items-center justify-center py-12">
      <Card className="w-full max-w-md p-7">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warn-50 text-warn-700">
            <Icon name="creditCard" size={20} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">
              {locale === "en" ? "Sandbox payment terminal" : "სატესტო საგადახდო ტერმინალი"}
            </p>
            <p className="text-[12px] text-ink-subtle">
              {locale === "en" ? "Development only" : "მხოლოდ დეველოპმენტისთვის"}
            </p>
          </div>
        </div>

        <Alert tone="warn" className="mb-5">
          {locale === "en"
            ? "No real money moves. Choosing an outcome delivers a signed callback to the webhook, exactly as a bank would — the webhook still verifies it before granting access."
            : "რეალური თანხა არ ჩამოიჭრება. არჩეული შედეგი გაიგზავნება webhook-ზე ხელმოწერილი callback-ით, ისევე როგორც ბანკი აკეთებს — წვდომა გაიხსნება მხოლოდ მისი ვერიფიკაციის შემდეგ."}
        </Alert>

        <dl className="mb-6 space-y-2.5 rounded-xl bg-surface-muted p-4 text-sm">
          <Row label={t.checkout.reference} value={transaction.purchase.reference} mono />
          <Row label={t.nav.courses} value={transaction.course.title} />
          <Row
            label={t.checkout.total}
            value={formatMoney(transaction.amountMinor, transaction.currency)}
            strong
          />
        </dl>

        <SandboxTerminal
          order={order}
          reference={transaction.purchase.reference}
          labels={{
            approve: locale === "en" ? "Approve payment" : "გადახდის დადასტურება",
            decline: locale === "en" ? "Decline payment" : "გადახდის უარყოფა",
            cancel: t.common.cancel,
          }}
        />
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd
        className={`text-right ${mono ? "font-mono text-[13px]" : ""} ${
          strong ? "text-base font-bold text-ink" : "font-medium text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
