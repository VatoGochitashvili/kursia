import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityGate } from "@/components/community/CommunityGate";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale }, creator] = await Promise.all([
    getI18n(),
    db.creatorProfile.findUnique({ where: { slug }, select: { displayName: true } }),
  ]);
  return buildMetadata({
    title: `${creator?.displayName ?? ""} — ${locale === "en" ? "Circle" : "წრე"}`,
    description:
      locale === "en"
        ? `The private space for ${creator?.displayName ?? ""}'s members.`
        : `${creator?.displayName ?? ""}-ის წევრების სივრცე.`,
    path: `/community/${slug}`,
    locale,
    // Members-only, so it must never be indexed.
    noindex: true,
  });
}

/**
 * The circle's front room.
 *
 * A member lands on the feed. Anyone else lands on what the circle is — its
 * cover and description — with the way in right beneath it, because a locked
 * feed on its own tells a visitor nothing about why they would want in.
 */
export default async function CircleFeedPage({ params }: Props) {
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
      <div className="grid gap-5">
        <CommunityHeader creator={creator} community={community} isMember={false} showPrice={Boolean(viewer)} t={t} />
        <CommunityGate
          community={community}
          creatorSlug={creator.slug}
          isAuthenticated={Boolean(viewer)}
          isOwner={membership.isOwner}
          gate={gate}
          loginHref={p(`/login?next=/community/${creator.slug}`)}
          coursesHref={p(`/creator/${creator.slug}`)}
          locale={locale}
          t={t}
        />
      </div>
    );
  }

  return (
    <CommunityFeed creatorId={creator.id} viewerId={viewer?.id ?? null} locale={locale} t={t} />
  );
}
