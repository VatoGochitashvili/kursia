import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getI18n, localePath } from "@/i18n";
import { DashboardShell, type NavGroup } from "@/components/layout/DashboardShell";

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
        { href: p("/dashboard/creator/reviews"), label: t.creator.reviews, icon: "star" },
        { href: p("/dashboard/creator/analytics"), label: t.creator.analytics, icon: "grid" },
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
    {
      title: t.nav.myLearning,
      items: [{ href: p("/dashboard"), label: t.dashboard.myCourses, icon: "book", exact: true }],
    },
    ...(user.role === "ADMIN"
      ? [{ items: [{ href: p("/admin"), label: t.nav.admin, icon: "shield" as const }] }]
      : []),
  ];

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
