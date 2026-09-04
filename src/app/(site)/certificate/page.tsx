import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { buildMetadata } from "@/lib/seo";
import { CertificateLookup } from "@/components/certificate/CertificateLookup";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.certificate.verifyTitle,
    description:
      locale === "en"
        ? "Verify the authenticity of any certificate issued on the platform by entering its ID."
        : "შეამოწმეთ პლატფორმაზე გაცემული ნებისმიერი სერტიფიკატის ნამდვილობა მისი ID-ით.",
    path: "/certificate",
    locale,
  });
}

/** Public certificate lookup form. */
export default async function CertificateLookupPage() {
  const { locale, t } = await getI18n();

  return (
    <div className="container-page flex min-h-[70dvh] items-center justify-center py-14">
      <Card className="w-full max-w-lg p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="shield" size={22} />
        </span>
        <h1 className="mt-4 text-2xl">{t.certificate.verifyTitle}</h1>
        <p className="mt-2 text-[15px] text-ink-muted">{t.certificate.verifySubtitle}</p>

        <div className="mt-6">
          <CertificateLookup
            basePath={localePath("/certificate", locale)}
            labels={{
              placeholder: "KRS-XXXX-XXXX",
              submit: t.certificate.verifyAt,
            }}
          />
        </div>

        <p className="mt-5 text-[12px] text-ink-subtle">
          {locale === "en"
            ? "Every certificate carries a unique ID and a digital signature. If the record has been altered, verification fails."
            : "თითოეულ სერტიფიკატს აქვს უნიკალური ID და ციფრული ხელმოწერა. თუ ჩანაწერი შეიცვალა, შემოწმება წარუმატებელი იქნება."}
        </p>
      </Card>
    </div>
  );
}
