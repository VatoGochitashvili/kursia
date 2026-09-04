import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyEmailPanel } from "@/components/auth/SimpleAuthForms";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.auth.verifyEmailTitle,
    description: t.auth.verifyEmailBody,
    path: "/verify-email",
    locale,
    noindex: true,
  });
}

export default async function VerifyEmailPage() {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const p = (path: string) => localePath(path, locale);

  return (
    <AuthShell
      brand={locale === "en" ? settings.platformName : settings.platformNameKa}
      homeHref={p("/")}
      title={t.auth.verifyEmailTitle}
      subtitle={t.auth.verifyEmailBody}
      footer={
        <Link href={p("/dashboard")} className="font-semibold text-brand-600 hover:underline">
          {t.nav.dashboard}
        </Link>
      }
    >
      <Suspense fallback={<div className="skeleton h-14 rounded-xl" />}>
        <VerifyEmailPanel
          labels={{
            confirm: t.auth.verifyEmailTitle,
            verified: t.auth.verifiedTitle,
            invalidToken: t.auth.invalidToken,
            checkInbox: t.auth.verifyEmailBody,
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
