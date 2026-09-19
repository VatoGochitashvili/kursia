import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { StartPlans } from "@/components/creator/StartPlans";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.start.title,
    description: t.start.subtitle,
    path: "/start",
    locale,
  });
}

/**
 * Where someone becomes a creator: two plans, monthly or yearly.
 *
 * Public on purpose — the price is the first thing a person weighing this up
 * wants to see, and hiding it behind a sign-up form loses the ones who were
 * only curious.
 */
export default async function StartPage() {
  const [{ locale, t }, user, settings] = await Promise.all([
    getI18n(),
    getSessionUser(),
    getSettings(),
  ]);
  const p = (path: string) => localePath(path, locale);

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mx-auto max-w-xl text-center">
        <h1 className="text-[2rem]/[1.2] font-bold tracking-tight sm:text-[2.4rem]/[1.18]">
          {t.start.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted sm:text-base">
          {t.start.subtitle}
        </p>
      </header>

      <div className="mx-auto mt-9 max-w-3xl">
        <StartPlans
          monthlyMinor={settings.creatorPlanPriceMinor}
          yearlyMinor={settings.creatorPlanYearlyPriceMinor}
          currency={settings.currency}
          isSignedIn={Boolean(user)}
          loginHref={p("/login?next=/start")}
          t={t}
        />
      </div>
    </div>
  );
}
