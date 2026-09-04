import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getI18n, localePath } from "@/i18n";
import { DashboardShell, type NavGroup } from "@/components/layout/DashboardShell";

/**
 * Admin chrome.
 *
 * This layout is a hard gate: a non-admin never renders a single admin child
 * page. Every admin API route re-checks the role independently, so the UI gate
 * is convenience, not the security boundary.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  const p = (path: string) => localePath(path, locale);

  if (!user) redirect(p("/login?next=/admin"));
  if (user.role !== "ADMIN") redirect(p("/dashboard"));

  const [pendingCourses, openReports, pendingRefunds, pendingPayouts] = await Promise.all([
    db.course.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    db.refund.count({ where: { status: "REQUESTED" } }),
    db.payout.count({ where: { status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } } }),
  ]);

  const groups: NavGroup[] = [
    {
      items: [{ href: p("/admin"), label: t.admin.overview, icon: "chart", exact: true }],
    },
    {
      title: t.admin.moderation,
      items: [
        {
          href: p("/admin/courses"),
          label: t.admin.courses,
          icon: "video",
          badge: pendingCourses,
        },
        { href: p("/admin/reviews"), label: t.admin.reviews, icon: "star" },
        { href: p("/admin/reports"), label: t.admin.reports, icon: "alert", badge: openReports },
      ],
    },
    {
      title: t.admin.transactions,
      items: [
        { href: p("/admin/transactions"), label: t.admin.transactions, icon: "creditCard" },
        { href: p("/admin/refunds"), label: t.admin.refunds, icon: "refresh", badge: pendingRefunds },
        { href: p("/admin/payouts"), label: t.admin.payouts, icon: "bank", badge: pendingPayouts },
      ],
    },
    {
      title: t.nav.settings,
      items: [
        { href: p("/admin/users"), label: t.admin.users, icon: "users" },
        { href: p("/admin/categories"), label: t.admin.categories, icon: "tag" },
        { href: p("/admin/settings"), label: t.admin.settings, icon: "settings" },
        { href: p("/admin/audit"), label: t.admin.auditLog, icon: "shield" },
      ],
    },
  ];

  return (
    <DashboardShell
      title={t.admin.title}
      groups={groups}
      mobileTabs={[
        { href: p("/admin"), label: t.admin.overview, icon: "chart", exact: true },
        { href: p("/admin/courses"), label: t.admin.courses, icon: "video", badge: pendingCourses },
        { href: p("/admin/users"), label: t.admin.users, icon: "users" },
        { href: p("/admin/payouts"), label: t.admin.payouts, icon: "bank", badge: pendingPayouts },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
