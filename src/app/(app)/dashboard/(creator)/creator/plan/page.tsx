import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getPlanState } from "@/lib/creator-plan";
import { PageHeader } from "@/components/layout/DashboardShell";
import { PlanPanel } from "@/components/creator/PlanPanel";

export const metadata: Metadata = { title: "Plan", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorPlanPage() {
  const [{ locale, t }, user, settings] = await Promise.all([
    getI18n(),
    getSessionUser(),
    getSettings(),
  ]);
  const p = (path: string) => localePath(path, locale);

  if (!user) redirect(p("/login?next=/dashboard/creator/plan"));
  if (!user.creatorId) redirect(p("/dashboard/profile"));

  const creator = await db.creatorProfile.findUnique({
    where: { id: user.creatorId },
    select: { id: true },
  });
  if (!creator) redirect(p("/dashboard/profile"));

  const plan = await getPlanState(creator.id, settings.creatorPlanPriceMinor);

  return (
    <>
      <PageHeader title={t.plan.title} subtitle={t.plan.subtitle} />
      <div className="max-w-lg">
        <PlanPanel
          priceMinor={plan.priceMinor}
          currency={settings.currency}
          isFree={plan.isFree}
          active={plan.active}
          status={plan.status}
          currentPeriodEnd={plan.currentPeriodEnd?.toISOString() ?? null}
          locale={locale}
          t={t}
        />
      </div>
    </>
  );
}
