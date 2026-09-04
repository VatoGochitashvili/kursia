import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/SimpleAuthForms";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.auth.resetTitle,
    description: t.auth.resetSubtitle,
    path: "/reset-password",
    locale,
    noindex: true,
  });
}

export default async function ResetPasswordPage() {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);

  return (
    <AuthShell
      brand={locale === "en" ? settings.platformName : settings.platformNameKa}
      homeHref={localePath("/", locale)}
      title={t.auth.resetTitle}
      subtitle={t.auth.resetSubtitle}
    >
      <Suspense fallback={<div className="skeleton h-40 rounded-xl" />}>
        <ResetPasswordForm
          labels={{
            newPassword: t.auth.newPassword,
            passwordHint:
              locale === "en"
                ? "At least 10 characters, including a digit"
                : "მინიმუმ 10 სიმბოლო, ერთი ციფრის ჩათვლით",
            submit: t.common.save,
            changed: t.auth.passwordChanged,
            invalidToken: t.auth.invalidToken,
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
