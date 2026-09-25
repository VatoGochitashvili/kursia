import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { StartPlans } from "@/components/creator/StartPlans";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.start.seePlans,
    description: t.start.subtitle,
    path: "/start/plans",
    locale,
  });
}

/**
 * The two plans, on a page of their own.
 *
 * Deliberately not a section further down /start: somebody who has pressed
 * "create your circle" has decided to look at the price, and a page that
 * answers that question alone is easier to read — and easier to link to —
 * than a scroll position.
 */
export default async function StartPlansPage() {
  const [{ locale, t }, user, settings] = await Promise.all([
    getI18n(),
    getSessionUser(),
    getSettings(),
  ]);
  const p = (path: string) => localePath(path, locale);

  return (
    <div className="container-page py-10 sm:py-14">
      <Link
        href={p("/start")}
        className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <Icon name="arrowLeft" size={15} />
        {t.start.heroTitle}
      </Link>

      <header className="mx-auto mt-6 max-w-xl text-center">
        <h1 className="text-[1.9rem]/[1.2] font-bold tracking-tight sm:text-[2.3rem]/[1.18]">
          {t.start.seePlans}
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
          loginHref={p("/login?next=/start/plans")}
          t={t}
        />
      </div>
    </div>
  );
}
