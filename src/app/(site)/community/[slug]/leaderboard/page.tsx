import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/community";
import { buildMetadata } from "@/lib/seo";
import { Avatar, Breadcrumbs, Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LeaderboardPanel } from "@/components/community/LeaderboardPanel";
import { CommunityTabs } from "@/components/community/CommunityTabs";

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
      user: { select: { id: true, profile: { select: { avatarUrl: true } } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [creator, { locale, t }] = await Promise.all([loadCreator(slug), getI18n()]);
  if (!creator) notFound();

  return buildMetadata({
    title: `${creator.displayName} — ${t.leaderboard.title}`,
    description: t.leaderboard.subtitle,
    path: `/community/${creator.slug}/leaderboard`,
    locale,
    // Names and avatars of a creator's paying students. Never indexed.
    noindex: true,
  });
}

export default async function CommunityLeaderboardPage({ params }: Props) {
  const { slug } = await params;
  const [creator, { locale, t }, viewer] = await Promise.all([
    loadCreator(slug),
    getI18n(),
    getSessionUser(),
  ]);
  if (!creator) notFound();

  const membership = await getMembership(viewer?.id ?? null, creator.id);
  const p = (path: string) => localePath(path, locale);

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: locale === "en" ? "Home" : "მთავარი", href: p("/") },
          { label: creator.displayName, href: p(`/creator/${creator.slug}`) },
          { label: t.leaderboard.title },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar src={creator.user.profile?.avatarUrl ?? null} name={creator.displayName} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">{creator.displayName}</h1>
          <p className="mt-0.5 text-[14px] text-ink-muted">{t.leaderboard.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <CommunityTabs slug={creator.slug} active="leaderboard" locale={locale} t={t} />

        {membership.isMember ? (
          <LeaderboardPanel
            creatorId={creator.id}
            viewerId={viewer?.id ?? null}
            locale={locale}
            t={t}
          />
        ) : (
          <Card className="p-8 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon name="lock" size={24} />
            </span>
            <h2 className="mt-5 text-xl">{t.community.lockedTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">
              {t.community.lockedBody}
            </p>
            <ButtonLink className="mt-6" href={p(`/creator/${creator.slug}`)} size="lg">
              {t.community.lockedCta}
              <Icon name="arrowRight" size={17} />
            </ButtonLink>
          </Card>
        )}
      </div>
    </div>
  );
}
