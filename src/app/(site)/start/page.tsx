import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { buildMetadata } from "@/lib/seo";
import { StartShowcase } from "@/components/creator/StartShowcase";
import { listShowcaseCircles } from "@/lib/communities";
import { formatMoney } from "@/lib/money";
import { fill } from "@/i18n/config";
import { Icon } from "@/components/ui/Icon";

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
  const [{ locale, t }] = await Promise.all([getI18n()]);
  const p = (path: string) => localePath(path, locale);
  const showcase = await listShowcaseCircles(locale, 6);

  return (
    <div className="container-page py-10 sm:py-14">
      {/* What a circle is worth, before what it costs: somebody weighing this
          up wants to see it working before they see a price. */}
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-[2rem]/[1.2] font-bold tracking-tight sm:text-[2.6rem]/[1.15]">
          {t.start.heroTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
          {t.start.heroSubtitle}
        </p>
      </header>

      {showcase.length > 0 && (
        <>
          <StartShowcase
            circles={showcase}
            labels={{
              earns: t.start.earnsPerMonth,
              members: t.start.membersShort,
              previous: t.start.carouselPrev,
              next: t.start.carouselNext,
            }}
            formatEarnings={showcase.map((circle) =>
              fill(t.start.earnsPerMonth, {
                amount: formatMoney(circle.monthlyMinor, circle.currency),
              }),
            )}
          />
          <p className="mx-auto mt-4 max-w-md text-center text-[12px] leading-relaxed text-ink-subtle">
            {t.start.showcaseNote}
          </p>
        </>
      )}

      <div className="mt-8 flex justify-center">
        {/* Onward to the price, on its own page — pressing this is the
            decision to look at what it costs, not a scroll. */}
        <Link
          href={p("/start/plans")}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-brand-700 sm:text-base"
        >
          <Icon name="plus" size={18} />
          {t.start.title}
        </Link>
      </div>

    </div>
  );
}
