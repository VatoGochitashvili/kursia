import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { LeaderboardPanel } from "@/components/community/LeaderboardPanel";
import { CommunityGate } from "@/components/community/CommunityGate";

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

  if (!membership.isMember) {
    return (
      <CommunityGate
        community={community}
        creatorSlug={creator.slug}
        isAuthenticated={Boolean(viewer)}
        isOwner={membership.isOwner}
        gate={gate}
        loginHref={p(`/login?next=/community/${creator.slug}/leaderboard`)}
        coursesHref={p(`/creator/${creator.slug}`)}
        locale={locale}
        t={t}
      />
    );
  }

  return (
    <LeaderboardPanel creatorId={creator.id} viewerId={viewer?.id ?? null} locale={locale} t={t} />
  );
}
