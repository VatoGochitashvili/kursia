import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { EventsPanel } from "@/components/community/EventsPanel";
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
    title: `${creator?.displayName ?? ""} — ${t.events.title}`,
    description: t.events.subtitle,
    path: `/community/${slug}/events`,
    locale,
    noindex: true,
  });
}

/**
 * The circle's calendar.
 *
 * The course list fills the "which cohort?" dropdown for whoever may schedule
 * — the owner or an appointed admin — and is not loaded for anyone else, since
 * it would leak the titles of unpublished courses.
 */
export default async function CircleEventsPage({ params }: Props) {
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
        loginHref={p(`/login?next=/community/${creator.slug}/events`)}
        coursesHref={p(`/creator/${creator.slug}`)}
        locale={locale}
        t={t}
      />
    );
  }

  const courses = membership.canModerate
    ? await db.course.findMany({
        where: { creatorId: creator.id, status: { not: "ARCHIVED" } },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return <EventsPanel creatorId={creator.id} courses={courses} locale={locale} t={t} />;
}
