import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityGate } from "@/components/community/CommunityGate";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale, t }, creator] = await Promise.all([
    getI18n(),
    db.creatorProfile.findUnique({
      where: { slug },
      select: { displayName: true, communityName: true, communityTagline: true },
    }),
  ]);
  return buildMetadata({
    title: `${creator?.communityName ?? creator?.displayName ?? ""} — ${t.circle.tabAbout}`,
    description: creator?.communityTagline ?? t.communities.subtitle,
    path: `/community/${slug}/about`,
    locale,
  });
}

/**
 * What the circle is, open to everyone. The one section a visitor can read in
 * full before deciding whether to ask to join.
 */
export default async function CircleAboutPage({ params }: Props) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator, membership, community, gate } = await loadCommunityPage(
    slug,
    viewer?.id ?? null,
    locale,
  );
  const p = (path: string) => localePath(path, locale);

  return (
    <div className="grid gap-5">
      <CommunityHeader creator={creator} community={community} isMember={membership.isMember} t={t} />
      {!membership.isMember && (
        <CommunityGate
          community={community}
          creatorSlug={creator.slug}
          isAuthenticated={Boolean(viewer)}
          isOwner={membership.isOwner}
          gate={gate}
          loginHref={p(`/login?next=/community/${creator.slug}/about`)}
          coursesHref={p(`/creator/${creator.slug}`)}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}
