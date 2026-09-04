import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth/session";
import { getPlatformStats } from "@/lib/courses";
import { formatCount } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Icon } from "@/components/ui/Icon";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.auth.registerTitle,
    description: t.auth.registerSubtitle,
    path: "/register",
    locale,
    noindex: true,
  });
}

export default async function RegisterPage() {
  const [{ locale, t }, settings, user, stats] = await Promise.all([
    getI18n(),
    getSettings(),
    getSessionUser(),
    getPlatformStats(),
  ]);

  if (user) redirect(localePath("/dashboard", locale));

  const p = (path: string) => localePath(path, locale);

  return (
    <AuthShell
      brand={locale === "en" ? settings.platformName : settings.platformNameKa}
      homeHref={p("/")}
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.hasAccount}{" "}
          <Link href={p("/login")} className="font-semibold text-brand-600 hover:underline">
            {t.auth.signIn}
          </Link>
        </>
      }
      aside={
        <div className="max-w-md text-white">
          <p className="text-2xl font-bold leading-snug">
            {locale === "en" ? settings.taglineEn : settings.taglineKa}
          </p>
          <ul className="mt-7 space-y-3.5">
            {[
              locale === "en"
                ? `${formatCount(stats.courses, locale)} courses across ${formatCount(stats.creators, locale)} instructors`
                : `${formatCount(stats.courses, locale)} კურსი, ${formatCount(stats.creators, locale)} ინსტრუქტორი`,
              locale === "en" ? "Pay in GEL with a Georgian card" : "გადახდა ლარში, ქართული ბარათით",
              locale === "en" ? "Lifetime access and a verifiable certificate" : "სამუდამო წვდომა და დამოწმებადი სერტიფიკატი",
              locale === "en" ? "Learn on any device" : "ისწავლე ნებისმიერ მოწყობილობაზე",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[15px] text-white/80">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  <Icon name="check" size={13} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
        <RegisterForm
          locale={locale}
          labels={{
            accountType: t.auth.accountType,
            asStudent: t.auth.asStudent,
            asStudentHint: t.auth.asStudentHint,
            asCreator: t.auth.asCreator,
            asCreatorHint: t.auth.asCreatorHint,
            fullName: t.auth.fullName,
            displayName: t.auth.displayName,
            displayNameHint:
              locale === "en"
                ? "Shown on your public instructor page"
                : "გამოჩნდება თქვენს საჯარო გვერდზე",
            email: t.auth.email,
            password: t.auth.password,
            passwordHint:
              locale === "en"
                ? "At least 10 characters, including a digit"
                : "მინიმუმ 10 სიმბოლო, ერთი ციფრის ჩათვლით",
            acceptTerms: t.auth.acceptTerms,
            submit: t.auth.createAccount,
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
