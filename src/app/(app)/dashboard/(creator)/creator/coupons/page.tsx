import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/layout/DashboardShell";
import { CouponManager } from "@/components/creator/CouponManager";

export const metadata: Metadata = { title: "Discount codes", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorCouponsPage() {
  const [{ locale, t }, creator, settings] = await Promise.all([
    getI18n(),
    requireCreator(),
    getSettings(),
  ]);

  // Only the creator's own courses can be scoped to, which is also enforced
  // server-side when a code is created.
  const courses = await db.course.findMany({
    where: { creatorId: creator.creatorId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <>
      <PageHeader title={t.creator.coupons} subtitle={t.creator.couponsSubtitle} />
      <CouponManager
        courses={courses}
        currency={settings.currency}
        locale={locale}
        t={t}
      />
    </>
  );
}
