import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { listCircleMembers } from "@/lib/circle-members";
import { buildMetadata } from "@/lib/seo";
import { CommunityGate } from "@/components/community/CommunityGate";
import { JoinRequests } from "@/components/creator/JoinRequests";
import { MembersPanel, type MemberRow } from "@/components/circle/MembersPanel";
import { RemovedMembers, type RemovedRow } from "@/components/circle/RemovedMembers";

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
    title: `${creator?.displayName ?? ""} — ${t.circle.members}`,
    description: t.circle.adminsHint,
    path: `/community/${slug}/members`,
    locale,
    // A list of real people's names. Never indexed.
    noindex: true,
  });
}

/**
 * Who is in the circle, and the door they came through.
 *
 * Pending requests sit on top for anyone who can approve them — the owner and
 * the admins they appointed — because that is the work waiting on this page.
 * Appointing admins is drawn for the owner alone.
 */
export default async function CircleMembersPage({ params }: Props) {
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
        loginHref={p(`/login?next=/community/${creator.slug}/members`)}
        coursesHref={p(`/creator/${creator.slug}`)}
        locale={locale}
        t={t}
      />
    );
  }

  const members: MemberRow[] = (await listCircleMembers(creator.id)).map((m) => ({
    userId: m.userId,
    name: m.name,
    avatarUrl: m.avatarUrl,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    level: m.level,
  }));

  const removed: RemovedRow[] = membership.canModerate
    ? (
        await db.communityBan.findMany({
          where: { creatorId: creator.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            userId: true,
            reason: true,
            createdAt: true,
            user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
          },
        })
      ).map((row) => ({
        userId: row.userId,
        name: row.user.profile?.fullName ?? "—",
        avatarUrl: row.user.profile?.avatarUrl ?? null,
        reason: row.reason,
        removedAt: row.createdAt.toISOString(),
      }))
    : [];

  return (
    <div className="grid gap-5">
      {membership.canModerate && (
        <JoinRequests creatorId={creator.id} locale={locale} t={t} />
      )}
      <MembersPanel
        creatorId={creator.id}
        members={members}
        canAssign={membership.isOwner || membership.isAdmin}
        canRemove={membership.canModerate}
        profileBase={p(`/community/${creator.slug}/members`)}
        locale={locale}
        t={t}
      />
      {membership.canModerate && (
        <RemovedMembers creatorId={creator.id} rows={removed} locale={locale} t={t} />
      )}
    </div>
  );
}
