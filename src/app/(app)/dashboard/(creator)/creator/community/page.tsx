import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/DashboardShell";
import { CommunitySettings } from "@/components/creator/CommunitySettings";

export const metadata: Metadata = { title: "Community", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where a creator opens their community and prices it.
 *
 * The profile is resolved from the session, never from a parameter, so this
 * page can only ever configure the space belonging to whoever is signed in.
 */
export default async function CreatorCommunityPage() {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  const p = (path: string) => localePath(path, locale);

  if (!user) redirect(p("/login?next=/dashboard/creator/community"));
  if (!user.creatorId) redirect(p("/dashboard/profile"));

  const creator = await db.creatorProfile.findUnique({
    where: { id: user.creatorId },
    select: {
      slug: true,
      communityEnabled: true,
      communityName: true,
      communityTagline: true,
      communityDescription: true,
      communityPriceMinor: true,
      communityCurrency: true,
      communityMemberCount: true,
    },
  });
  if (!creator) redirect(p("/dashboard/profile"));

  const courses = await db.course.findMany({
    where: { creatorId: user.creatorId, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      title: true,
      includedInMembership: true,
      priceMinor: true,
      currency: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title={t.membership.settingsTitle} subtitle={t.membership.settingsBody} />
      <CommunitySettings
        initial={{
          enabled: creator.communityEnabled,
          name: creator.communityName ?? "",
          tagline: creator.communityTagline ?? "",
          description: creator.communityDescription ?? "",
          priceMinor: creator.communityPriceMinor,
          currency: creator.communityCurrency,
          memberCount: creator.communityMemberCount,
        }}
        courses={courses}
        communityHref={p(`/community/${creator.slug}`)}
        locale={locale}
        t={t}
      />
    </>
  );
}
