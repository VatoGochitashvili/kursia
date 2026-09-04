import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getI18n, localePath } from "@/i18n";
import { DashboardShell, type NavGroup } from "@/components/layout/DashboardShell";

/**
 * Student dashboard chrome. The creator studio nests under /dashboard/creator
 * and swaps in its own navigation, so a creator can move between "what I'm
 * learning" and "what I'm selling" without changing accounts.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) redirect(localePath("/login?next=/dashboard", locale));

  const [unread, wishlistCount, certificateCount] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.wishlist.count({ where: { userId: user.id } }),
    db.certificate.count({ where: { userId: user.id, revokedAt: null } }),
  ]);

  const p = (path: string) => localePath(path, locale);

  const groups: NavGroup[] = [
    {
      title: t.nav.myLearning,
      items: [
        { href: p("/dashboard"), label: t.dashboard.myCourses, icon: "book", exact: true },
        { href: p("/dashboard/wishlist"), label: t.nav.wishlist, icon: "heart", badge: wishlistCount },
        {
          href: p("/dashboard/certificates"),
          label: t.nav.certificates,
          icon: "award",
          badge: certificateCount,
        },
        { href: p("/dashboard/purchases"), label: t.nav.purchases, icon: "creditCard" },
      ],
    },
    {
      title: t.nav.settings,
      items: [
        { href: p("/dashboard/notifications"), label: t.nav.notifications, icon: "bell", badge: unread },
        { href: p("/dashboard/profile"), label: t.nav.profile, icon: "user" },
      ],
    },
    // Creators get a direct route into the studio from the learning sidebar.
    ...(user.creatorId
      ? [
          {
            title: t.creator.studio,
            items: [
              { href: p("/dashboard/creator"), label: t.creator.overview, icon: "chart" as const },
              { href: p("/dashboard/creator/courses"), label: t.creator.myCourses, icon: "video" as const },
            ],
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [{ items: [{ href: p("/admin"), label: t.nav.admin, icon: "shield" as const }] }]
      : []),
  ];

  return (
    <DashboardShell
      title={t.nav.dashboard}
      groups={groups}
      mobileTabs={[
        { href: p("/dashboard"), label: t.dashboard.myCourses, icon: "book", exact: true },
        { href: p("/dashboard/wishlist"), label: t.nav.wishlist, icon: "heart" },
        { href: p("/dashboard/certificates"), label: t.nav.certificates, icon: "award" },
        { href: p("/dashboard/notifications"), label: t.nav.notifications, icon: "bell", badge: unread },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
