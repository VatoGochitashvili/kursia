import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Certificates", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();

  const certificates = await db.certificate.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true, code: true, courseTitle: true, instructorName: true, issuedAt: true,
      course: { select: { slug: true } },
    },
  });

  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <PageHeader title={t.nav.certificates} subtitle={t.dashboard.certificates} />

      {certificates.length === 0 ? (
        <EmptyState
          icon={<Icon name="award" size={30} />}
          title={t.common.empty}
          body={
            locale === "en"
              ? "Finish a course to earn your first certificate."
              : "დაასრულეთ კურსი და მიიღეთ პირველი სერტიფიკატი."
          }
          action={<ButtonLink href={p("/dashboard")}>{t.dashboard.myCourses}</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <li key={certificate.id}>
              <Card className="group relative flex h-full flex-col overflow-hidden transition-all hover:border-brand-200 hover:shadow-md">
                {/* Certificate-style header band. */}
                <div className="relative bg-ink p-5 text-white">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(20rem 10rem at 20% 0%, rgb(53 89 240 / 0.5), transparent 65%)",
                    }}
                  />
                  <div className="relative">
                    <Icon name="award" size={26} className="text-warn-500" />
                    <p className="mt-2.5 text-[11px] uppercase tracking-wider text-white/50">
                      {t.certificate.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[13px] font-bold tracking-wide text-white">
                      {certificate.code}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[15px] font-bold leading-snug">
                    <Link
                      href={p(`/certificate/${certificate.code}`)}
                      className="line-clamp-2 after:absolute after:inset-0 after:content-['']"
                    >
                      {certificate.courseTitle}
                    </Link>
                  </h3>
                  <p className="mt-1 text-[12px] text-ink-muted">{certificate.instructorName}</p>
                  <p className="mt-auto pt-3 text-[11px] text-ink-subtle">
                    {t.certificate.issuedOn}: {formatDate(certificate.issuedAt, locale)}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
