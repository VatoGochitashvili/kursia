import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getI18n, localePath } from "@/i18n";
import { DashboardShell, type NavGroup } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { getSettings } from "@/lib/settings";
import { getPlanState } from "@/lib/creator-plan";
import { PATHNAME_HEADER } from "@/i18n/config";

/**
 * Creator studio chrome. Replaces the student sidebar for everything under
 * /dashboard/creator, so selling and learning stay visually distinct.
 */
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  const p = (path: string) => localePath(path, locale);

  if (!user) redirect(p("/login?next=/dashboard/creator"));
  // A student who lands here is sent to the upgrade form rather than a 403.
  if (!user.creatorId) redirect(p("/dashboard/profile"));

  // The studio is what the creator plan pays for. The plan page itself has to
  // stay reachable without one, or somebody who let their plan lapse could
  // never get back in to renew it.
  const settings = await getSettings();
  const plan = await getPlanState(user.creatorId, settings.creatorPlanPriceMinor);
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";
  const onPlanPage = pathname.startsWith("/dashboard/creator/plan");

  const [draftCount, pendingPayouts] = await Promise.all([
    db.course.count({
      where: { creatorId: user.creatorId, status: { in: ["DRAFT", "CHANGES_REQUESTED", "REJECTED"] } },
    }),
    db.payout.count({
      where: { creatorId: user.creatorId, status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } },
    }),
  ]);

  const groups: NavGroup[] = [
    {
      title: t.creator.studio,
      items: [
        { href: p("/dashboard/creator"), label: t.creator.overview, icon: "chart", exact: true },
        {
          href: p("/dashboard/creator/courses"),
          label: t.creator.myCourses,
          icon: "video",
          badge: draftCount,
        },
        { href: p("/dashboard/creator/students"), label: t.creator.students, icon: "users" },
        {
          href: p("/dashboard/creator/community"),
          label: t.membership.settingsTitle,
          icon: "message",
        },
        { href: p("/dashboard/creator/plan"), label: t.plan.title, icon: "wallet" },
        { href: p("/dashboard/creator/reviews"), label: t.creator.reviews, icon: "star" },
        { href: p("/dashboard/creator/analytics"), label: t.creator.analytics, icon: "grid" },
        { href: p("/dashboard/creator/coupons"), label: t.creator.coupons, icon: "tag" },
        { href: p("/dashboard/creator/announcements"), label: t.creator.announcements, icon: "megaphone" },
      ],
    },
    {
      title: t.creator.earnings,
      items: [
        { href: p("/dashboard/creator/sales"), label: t.creator.sales, icon: "creditCard" },
        { href: p("/dashboard/creator/earnings"), label: t.creator.earnings, icon: "wallet" },
        {
          href: p("/dashboard/creator/payouts"),
          label: t.creator.payouts,
          icon: "bank",
          badge: pendingPayouts,
        },
      ],
    },
    ...(user.role === "ADMIN"
      ? [{ items: [{ href: p("/admin"), label: t.nav.admin, icon: "shield" as const }] }]
      : []),
  ];

  if (!plan.active && !onPlanPage) {
    // Only the plan. Listing the studio's nine sections beside a lock screen
    // advertises a room this account cannot enter, and every one of those
    // links would bounce straight back here.
    const lockedGroups: NavGroup[] = [
      { items: [{ href: p("/dashboard/creator/plan"), label: t.plan.title, icon: "wallet" }] },
    ];

    return (
      <DashboardShell title={t.creator.studio} groups={lockedGroups} mobileTabs={[]}>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-warn-50 text-warn-700">
            <Icon name="lock" size={24} />
          </span>
          <h1 className="mt-5 text-xl">{t.plan.inactive}</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            {t.plan.inactiveBody}
          </p>
          <Link
            href={p("/dashboard/creator/plan")}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {t.plan.subscribe}
            <Icon name="arrowRight" size={17} />
          </Link>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={t.creator.studio}
      groups={groups}
      mobileTabs={[
        { href: p("/dashboard/creator"), label: t.creator.overview, icon: "chart", exact: true },
        { href: p("/dashboard/creator/courses"), label: t.creator.myCourses, icon: "video" },
        { href: p("/dashboard/creator/sales"), label: t.creator.sales, icon: "creditCard" },
        { href: p("/dashboard/creator/earnings"), label: t.creator.earnings, icon: "wallet" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
