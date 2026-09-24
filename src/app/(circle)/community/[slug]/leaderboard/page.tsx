import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { LeaderboardPanel } from "@/components/community/LeaderboardPanel";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale, t }, creator] = await Promise.all([
    getI18n(),
    db.creatorProfile.findUnique({ where: { slug }, select: { displayName: true } }),
  ]);
  return buildMetadata({
    title: `${creator?.displayName ?? ""} — ${t.leaderboard.title}`,
    description: t.leaderboard.subtitle,
    path: `/community/${slug}/leaderboard`,
    locale,
    // Names of a creator's paying members. Never indexed.
    noindex: true,
  });
}

export default async function CircleLeaderboardPage({ params }: Props) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator, membership, community, gate } = await loadCommunityPage(
    slug,
    viewer?.id ?? null,
    locale,
  );
  const p = (path: string) => localePath(path, locale);

  // One page for a visitor: everything about the circle lives there, and
  // the sections are what membership opens.
  if (!membership.isMember) redirect(p(`/community/${creator.slug}`));

  return (
    <LeaderboardPanel creatorId={creator.id} viewerId={viewer?.id ?? null} locale={locale} t={t} />
  );
}
