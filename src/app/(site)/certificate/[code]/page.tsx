import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { verifyCertificate } from "@/lib/certificates";
import { formatDate } from "@/lib/format";
import { buildMetadata, siteUrl } from "@/lib/seo";
import { Logo } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/**
 * Public certificate verification — /certificate/[code].
 *
 * Anyone (an employer, a recruiter) can open this without an account. It shows
 * the certificate as issued and states plainly whether it verifies, including
 * a tamper check: the stored HMAC is recomputed from the record's own fields,
 * so an edited row reports TAMPERED rather than silently passing.
 */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const { locale } = await getI18n();
  const result = await verifyCertificate(code);

  if (!result.valid || !result.certificate) {
    return buildMetadata({
      title: locale === "en" ? "Certificate not found" : "სერტიფიკატი ვერ მოიძებნა",
      description: "",
      path: `/certificate/${code}`,
      locale,
      noindex: true,
    });
  }

  return buildMetadata({
    title:
      locale === "en"
        ? `Certificate ${result.certificate.code} — ${result.certificate.studentName}`
        : `სერტიფიკატი ${result.certificate.code} — ${result.certificate.studentName}`,
    description:
      locale === "en"
        ? `${result.certificate.studentName} completed "${result.certificate.courseTitle}".`
        : `${result.certificate.studentName}-მ დაასრულა კურსი „${result.certificate.courseTitle}".`,
    path: `/certificate/${result.certificate.code}`,
    locale,
  });
}

export default async function CertificatePage({ params }: Props) {
  const { code } = await params;
  const [{ locale, t }, settings, result] = await Promise.all([
    getI18n(),
    getSettings(),
    verifyCertificate(code),
  ]);

  const p = (path: string) => localePath(path, locale);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  if (!result.valid || !result.certificate) {
    const reason =
      result.reason === "REVOKED"
        ? t.certificate.revoked
        : result.reason === "TAMPERED"
          ? t.certificate.tampered
          : t.certificate.notFound;

    return (
      <div className="container-page flex min-h-[70dvh] items-center justify-center py-14">
        <Card className="w-full max-w-md p-8 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
            <Icon name="close" size={30} />
          </span>
          <h1 className="mt-5 text-2xl">{t.certificate.invalid}</h1>
          <p className="mt-2 text-[15px] text-ink-muted">{reason}</p>
          <p className="mt-4 font-mono text-[13px] text-ink-subtle">{code.toUpperCase()}</p>
          <ButtonLink className="mt-6" href={p("/certificate")} variant="outline" fullWidth>
            {t.certificate.verifyTitle}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const certificate = result.certificate;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Alert tone="success" className="mb-6 no-print">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="check" size={16} />
            {t.certificate.valid}
          </span>
        </Alert>

        {/* The certificate itself — designed to be printed or screenshotted. */}
        <article className="relative overflow-hidden rounded-3xl border-2 border-line bg-surface p-8 shadow-lg sm:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(30rem 16rem at 100% 0%, rgb(53 89 240 / 0.07), transparent 60%)," +
                "radial-gradient(26rem 14rem at 0% 100%, rgb(255 87 16 / 0.06), transparent 60%)",
            }}
          />

          <div className="relative">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Logo size={34} />
                <span className="text-lg font-bold tracking-tight text-ink">{brand}</span>
              </div>
              <Icon name="award" size={34} className="text-warn-500" />
            </header>

            <p className="mt-10 text-[13px] font-semibold tracking-[0.14em] text-brand-600">
              {t.certificate.title}
            </p>

            <p className="mt-6 text-[13px] text-ink-muted">{t.certificate.issuedTo}</p>
            <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">
              {certificate.studentName}
            </h1>

            <p className="mt-7 text-[13px] text-ink-muted">
              {locale === "en"
                ? "has successfully completed the course"
                : "წარმატებით დაასრულა კურსი"}
            </p>
            <p className="mt-1 text-xl font-bold leading-snug text-ink sm:text-2xl">
              {certificate.courseSlug ? (
                <Link
                  href={p(`/courses/${certificate.courseSlug}`)}
                  className="hover:text-brand-600 hover:underline"
                >
                  {certificate.courseTitle}
                </Link>
              ) : (
                certificate.courseTitle
              )}
            </p>

            <dl className="mt-10 grid gap-5 border-t border-line pt-7 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] text-ink-subtle">{t.certificate.instructor}</dt>
                <dd className="mt-0.5 text-[14px] font-semibold text-ink">
                  {certificate.instructorName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-subtle">{t.certificate.issuedOn}</dt>
                <dd className="mt-0.5 text-[14px] font-semibold text-ink">
                  {formatDate(certificate.issuedAt, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-subtle">{t.certificate.certificateId}</dt>
                <dd className="mt-0.5 font-mono text-[14px] font-semibold text-ink">
                  {certificate.code}
                </dd>
              </div>
            </dl>

            <footer className="mt-8 border-t border-line pt-5">
              <p className="text-[11px] text-ink-subtle">
                {t.certificate.fingerprint}:{" "}
                <span className="font-mono">{certificate.fingerprint}</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-subtle">
                {t.certificate.verifyAt}: {siteUrl}
                {p(`/certificate/${certificate.code}`)}
              </p>
            </footer>
          </div>
        </article>

        <div className="mt-6 flex flex-wrap justify-center gap-3 no-print">
          <ButtonLink href={p("/certificate")} variant="outline">
            {t.certificate.verifyTitle}
          </ButtonLink>
          <ButtonLink href={p("/courses")}>{t.dashboard.browseCourses}</ButtonLink>
        </div>
      </div>
    </div>
  );
}
