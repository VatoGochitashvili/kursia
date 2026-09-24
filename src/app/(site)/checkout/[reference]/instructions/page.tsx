import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { requireUser } from "@/lib/auth/rbac";
import { getPurchaseForViewer } from "@/lib/checkout-view";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { PendingWatcher } from "@/components/checkout/PendingWatcher";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Bank-transfer instructions.
 *
 * The order stays PENDING until an administrator confirms the money arrived,
 * which runs the same fulfilment path as a card payment. Nothing on this page
 * grants access.
 */
export default async function TransferInstructionsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const { reference } = await params;
  const user = await requireUser();
  const purchase = await getPurchaseForViewer(reference, user.id, locale);
  const p = (path: string) => localePath(path, locale);

  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  return (
    <div className="container-page flex min-h-[70dvh] items-center justify-center py-14">
      <Card className="w-full max-w-lg p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="bank" size={22} />
        </span>
        <h1 className="mt-4 text-2xl">{t.checkout.bankTransferTitle}</h1>
        <p className="mt-2 text-[15px] text-ink-muted">{t.checkout.bankTransferBody}</p>

        <dl className="mt-6 space-y-3 rounded-xl border border-line bg-surface-muted p-5 text-sm">
          <Row
            label={locale === "en" ? "Beneficiary" : "მიმღები"}
            value={settings.bankBeneficiary || brand}
          />
          <Row
            label={locale === "en" ? "Account (IBAN)" : "ანგარიში (IBAN)"}
            value={settings.bankIban || "—"}
            mono
          />
          {settings.bankName && (
            <Row label={locale === "en" ? "Bank" : "ბანკი"} value={settings.bankName} />
          )}
          <Row
            label={t.checkout.total}
            value={formatMoney(purchase.amountMinor, purchase.currency)}
            strong
          />
          <Row label={t.checkout.reference} value={purchase.reference} mono strong />
        </dl>

        <Alert tone="warn" className="mt-5">
          {locale === "en"
            ? "Include the order reference in the payment description, otherwise we cannot match your transfer."
            : "აუცილებლად მიუთითეთ შეკვეთის ნომერი გადარიცხვის დანიშნულებაში — მის გარეშე გადარიცხვის იდენტიფიცირება ვერ მოხერხდება."}
        </Alert>

        {/* Only while the account is unset — once real details are saved the
            buyer should see instructions, not a note to the operator. */}
        {!settings.bankIban && (
          <Alert tone="brand" className="mt-3">
            {locale === "en"
              ? "No bank account is configured yet. Set the beneficiary and IBAN in Admin → Settings before going live."
              : "საბანკო რეკვიზიტები ჯერ არ არის მითითებული. გაშვებამდე შეავსეთ მიმღები და IBAN ადმინის პარამეტრებში."}
          </Alert>
        )}

        <div className="mt-7 space-y-2.5">
          <ButtonLink href={p("/dashboard/purchases")} size="lg" fullWidth>
            {t.dashboard.purchaseHistory}
          </ButtonLink>
          <ButtonLink href={p("/")} variant="outline" size="lg" fullWidth>
            {t.communities.browse}
          </ButtonLink>
        </div>

        <PendingWatcher reference={purchase.reference} />
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
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd
        className={`text-right text-ink ${mono ? "font-mono text-[13px]" : ""} ${
          strong ? "font-bold" : "font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
