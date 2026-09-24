import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { buildMetadata } from "@/lib/seo";
import { EventsPanel } from "@/components/community/EventsPanel";

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

  // One page for a visitor: everything about the circle lives there, and
  // the sections are what membership opens.
  if (!membership.isMember) redirect(p(`/community/${creator.slug}`));

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
