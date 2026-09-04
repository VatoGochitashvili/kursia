import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/SimpleAuthForms";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.auth.forgotTitle,
    description: t.auth.forgotSubtitle,
    path: "/forgot-password",
    locale,
    noindex: true,
  });
}

export default async function ForgotPasswordPage() {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const p = (path: string) => localePath(path, locale);

  return (
    <AuthShell
      brand={locale === "en" ? settings.platformName : settings.platformNameKa}
      homeHref={p("/")}
      title={t.auth.forgotTitle}
      subtitle={t.auth.forgotSubtitle}
      footer={
        <Link href={p("/login")} className="font-semibold text-brand-600 hover:underline">
          {t.auth.signIn}
        </Link>
      }
    >
      <Suspense fallback={<div className="skeleton h-40 rounded-xl" />}>
        <ForgotPasswordForm
          labels={{
            email: t.auth.email,
            submit: t.common.submit,
            sent: t.auth.resetLinkSent,
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
