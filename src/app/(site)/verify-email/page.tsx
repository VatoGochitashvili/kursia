import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSessionUser } from "@/lib/auth/session";
import { fill } from "@/i18n/config";
import { VerifyCodeForm } from "@/components/auth/VerifyCodeForm";

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

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string; next?: string }>;
}) {
  const [{ locale, t }, settings, user, query] = await Promise.all([
    getI18n(),
    getSettings(),
    getSessionUser(),
    searchParams,
  ]);
  const p = (path: string) => localePath(path, locale);
  // The session is the honest source; the query param covers somebody opening
  // the link in a browser where they are not signed in.
  const email = user?.email ?? query.email ?? "";

  return (
    <AuthShell
      brand={locale === "en" ? settings.platformName : settings.platformNameKa}
      homeHref={p("/")}
      title={t.auth.codeTitle}
      subtitle={fill(t.auth.codeBody, { email })}
      footer={
        <Link href={p("/dashboard")} className="font-semibold text-brand-600 hover:underline">
          {t.nav.dashboard}
        </Link>
      }
    >
      <Suspense fallback={<div className="skeleton h-14 rounded-xl" />}>
        <VerifyCodeForm
          email={email}
          labels={{
            label: t.auth.codeLabel,
            submit: t.auth.codeSubmit,
            resend: t.auth.codeResend,
            resent: t.auth.codeResent,
            done: t.auth.codeDone,
            continue: t.auth.codeContinue,
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
