import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { StartShowcase } from "@/components/creator/StartShowcase";
import { Logo } from "@/components/layout/Logo";
import { listShowcaseCircles } from "@/lib/communities";
import { formatMoney } from "@/lib/money";
import { fill } from "@/i18n/config";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.start.title,
    description: t.start.heroSubtitle,
    path: "/start",
    locale,
  });
}

/**
 * The door to starting a circle: circles already running, and one button.
 *
 * It fills the window and does not scroll — the logo at the top, the deck in
 * the middle, the button under it — so the whole argument is visible at once
 * on a phone as on a laptop. Everything is sized from the window's height,
 * and on a short screen the line under the headline steps aside first.
 */
export default async function StartPage() {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const p = (path: string) => localePath(path, locale);
  const showcase = await listShowcaseCircles(locale, 6);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  return (
    <>
      {/* The only way back to the rest of the site. */}
      <header className="flex shrink-0 justify-center pt-5 sm:pt-7">
        <Link
          href={p("/")}
          aria-label={brand}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1"
        >
          <Logo size={30} />
          <span className="text-[19px] font-bold tracking-tight text-ink">{brand}</span>
        </Link>
      </header>

      <main
        id="main"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 pb-6 sm:gap-6"
      >
        <div className="max-w-2xl text-center">
          <h1 className="text-balance text-[1.6rem]/[1.2] font-bold tracking-tight sm:text-[2.3rem]/[1.15] [@media(max-height:640px)]:text-[1.35rem]">
            {t.start.heroTitle}
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-muted sm:text-[15.5px] [@media(max-height:760px)]:hidden">
            {t.start.heroSubtitle}
          </p>
        </div>

        {showcase.length > 0 && (
          <StartShowcase
            circles={showcase}
            labels={{
              earns: t.start.earnsPerMonth,
              members: t.start.membersShort,
              previous: t.start.carouselPrev,
              next: t.start.carouselNext,
              // The one qualification the figure needs, on hover rather than
              // as a paragraph on a page that has room for none.
              earningsNote: t.start.showcaseNote,
            }}
            formatEarnings={showcase.map((circle) =>
              fill(t.start.earnsPerMonth, {
                amount: formatMoney(circle.monthlyMinor, circle.currency),
              }),
            )}
          />
        )}

        <Link
          href={p("/start/plans")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-brand-700 sm:text-base"
        >
          <Icon name="plus" size={18} />
          {t.start.title}
        </Link>
      </main>
    </>
  );
}
