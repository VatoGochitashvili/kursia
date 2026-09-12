import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { Avatar, Breadcrumbs, Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityTabs } from "@/components/community/CommunityTabs";
import { CommunityGate } from "@/components/community/CommunityGate";
import { JoinCommunityCard } from "@/components/community/JoinCommunityCard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

async function loadCreator(slug: string) {
  return db.creatorProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      user: { select: { id: true, profile: { select: { avatarUrl: true, headline: true } } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [creator, { locale }] = await Promise.all([loadCreator(slug), getI18n()]);
  if (!creator) notFound();

  return buildMetadata({
    title: `${creator.displayName} — ${locale === "en" ? "Community" : "საზოგადოება"}`,
    description:
      locale === "en"
        ? `The private space for ${creator.displayName}'s students.`
        : `${creator.displayName}-ის სტუდენტების სივრცე.`,
    path: `/community/${creator.slug}`,
    locale,
    // Members-only, so it must never be indexed.
    noindex: true,
  });
}

/**
 * A creator's community space.
 *
 * Members only, and the gate is the same `getMembership` the API uses — a
 * non-member sees an invitation to buy rather than the feed, and the endpoint
 * behind it would refuse them anyway.
 */
export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator, membership, community, cancelled } = await loadCommunityPage(
    slug,
    viewer?.id ?? null,
    locale,
  );
  const p = (path: string) => localePath(path, locale);

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: locale === "en" ? "Home" : "მთავარი", href: p("/") },
          { label: creator.displayName, href: p(`/creator/${creator.slug}`) },
          { label: t.community.title },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar
          src={creator.avatarUrl}
          name={creator.displayName}
          size={56}
        />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">{creator.displayName}</h1>
          <p className="mt-0.5 text-[14px] text-ink-muted">{t.community.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <CommunityTabs slug={creator.slug} active="feed" locale={locale} t={t} />

        {membership.isSubscriber && (
          <div className="mb-5">
            <JoinCommunityCard
              community={community}
              isAuthenticated
              isOwner={false}
              isSubscriber
              memberUntil={membership.memberUntil?.toISOString() ?? null}
              cancelled={cancelled}
              loginHref={p("/login")}
              locale={locale}
              t={t}
            />
          </div>
        )}

        {membership.isMember ? (
          <CommunityFeed
            creatorId={creator.id}
            viewerId={viewer?.id ?? null}
            locale={locale}
            t={t}
          />
        ) : (
          <CommunityGate
            community={community}
            creatorSlug={creator.slug}
            isAuthenticated={Boolean(viewer)}
            isOwner={membership.isOwner}
            loginHref={p(`/login?next=/community/${creator.slug}`)}
            coursesHref={p(`/creator/${creator.slug}`)}
            locale={locale}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
