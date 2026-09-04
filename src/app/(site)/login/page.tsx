import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Stars } from "@/components/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.auth.loginTitle,
    description: t.auth.loginSubtitle,
    path: "/login",
    locale,
    // Authentication screens have no business in the index.
    noindex: true,
  });
}

export default async function LoginPage() {
  const [{ locale, t }, settings, user] = await Promise.all([
    getI18n(),
    getSettings(),
    getSessionUser(),
  ]);

  if (user) redirect(localePath("/dashboard", locale));

  const p = (path: string) => localePath(path, locale);

  return (
    <AuthShell
      brand={locale === "en" ? settings.platformName : settings.platformNameKa}
      homeHref={p("/")}
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link href={p("/register")} className="font-semibold text-brand-600 hover:underline">
            {t.auth.createAccount}
          </Link>
        </>
      }
      aside={
        <blockquote className="max-w-md text-white">
          <Stars rating={5} size={16} />
          <p className="mt-4 text-xl leading-relaxed">
            {locale === "en"
              ? "“The first Georgian platform where I could actually finish a course — and get a certificate that verifies.”"
              : "„პირველი ქართული პლატფორმა, სადაც კურსი ბოლომდე მივიყვანე — და სერტიფიკატიც მივიღე, რომლის შემოწმებაც შესაძლებელია.“"}
          </p>
          <footer className="mt-5 text-sm text-white/60">
            {locale === "en" ? "Mariam K. · Marketing specialist" : "მარიამ ქ. · მარკეტინგის სპეციალისტი"}
          </footer>
        </blockquote>
      }
    >
      <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
        <LoginForm
          forgotHref={p("/forgot-password")}
          labels={{
            email: t.auth.email,
            password: t.auth.password,
            forgot: t.auth.forgotPassword,
            submit: t.auth.signIn,
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
