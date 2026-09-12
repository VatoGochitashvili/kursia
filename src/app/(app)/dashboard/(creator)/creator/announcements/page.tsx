import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/layout/DashboardShell";
import { AnnouncementComposer } from "@/components/creator/AnnouncementComposer";

export const metadata: Metadata = { title: "Announcements", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorAnnouncementsPage() {
  const [{ locale, t }, creator] = await Promise.all([getI18n(), requireCreator()]);

  // studentCount is the denormalised figure the catalogue already maintains,
  // so the audience estimate costs nothing extra.
  const courses = await db.course.findMany({
    where: { creatorId: creator.creatorId },
    orderBy: { title: "asc" },
    select: { id: true, title: true, studentCount: true },
  });

  return (
    <>
      <PageHeader
        title={t.creator.announcements}
        subtitle={t.creator.announcementsSubtitle}
      />
      <AnnouncementComposer courses={courses} locale={locale} t={t} />
    </>
  );
}
