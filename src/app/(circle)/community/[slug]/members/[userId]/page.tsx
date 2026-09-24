import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { fill } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { listCircleMembers } from "@/lib/circle-members";
import { listMyCircles } from "@/lib/my-circles";
import { levelFor } from "@/lib/points";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { Avatar, Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { MemberActions } from "@/components/circle/MemberActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, userId } = await params;
  const [{ locale, t }, profile] = await Promise.all([
    getI18n(),
    db.profile.findUnique({ where: { userId }, select: { fullName: true } }),
  ]);
  return buildMetadata({
    title: profile?.fullName ?? t.circle.members,
    description: t.circle.contributionsTitle,
    path: `/community/${slug}/members/${userId}`,
    locale,
    // A real person's page inside a closed room. Never indexed.
    noindex: true,
  });
}

/**
 * One member, seen from inside a circle you are both in.
 *
 * What they have done here comes first — level, points, posts, the events they
 * turned up to — because that is what the room knows them by. Their other
 * circles follow, and the way to follow or write to them sits under the name.
 *
 * Only members see it, and only for someone who is in this circle: a profile
 * page is not a way to look up people across the platform.
 */
export default async function CircleMemberPage({ params }: Props) {
  const { slug, userId } = await params;
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

  const members = await listCircleMembers(creator.id);
  const member = members.find((m) => m.userId === userId);
  if (!member) notFound();
  const rank = members
    .slice()
    .sort((a, b) => b.points - a.points)
    .findIndex((m) => m.userId === userId) + 1;

  const [user, followers, following, viewerFollows, posts, replies, likes, events, recent, circles] =
    await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          createdAt: true,
          profile: {
            select: { fullName: true, avatarUrl: true, headline: true, bio: true, city: true },
          },
        },
      }),
      db.follow.count({ where: { followedUserId: userId } }),
      db.follow.count({ where: { followerId: userId, followedUserId: { not: null } } }),
      viewer && viewer.id !== userId
        ? db.follow.findFirst({
            where: { followerId: viewer.id, followedUserId: userId },
            select: { id: true },
          })
        : Promise.resolve(null),
      db.post.count({
        where: { creatorId: creator.id, authorId: userId, parentId: null, status: "VISIBLE" },
      }),
      db.post.count({
        where: { creatorId: creator.id, authorId: userId, parentId: { not: null }, status: "VISIBLE" },
      }),
      db.post.aggregate({
        where: { creatorId: creator.id, authorId: userId, status: "VISIBLE" },
        _sum: { likeCount: true },
      }),
      db.eventAttendee.count({ where: { userId, event: { creatorId: creator.id } } }),
      db.post.findMany({
        where: { creatorId: creator.id, authorId: userId, parentId: null, status: "VISIBLE" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, body: true, createdAt: true, likeCount: true, replyCount: true },
      }),
      listMyCircles(userId, locale),
    ]);

  const isSelf = viewer?.id === userId;
  const level = levelFor(member.points);
  const name = member.name;

  const stats: { label: string; value: number }[] = [
    { label: t.circle.points, value: member.points },
    { label: t.circle.posts, value: posts },
    { label: t.circle.replies, value: replies },
    { label: t.circle.likesReceived, value: likes._sum.likeCount ?? 0 },
    { label: t.circle.eventsAttended, value: events },
  ];

  return (
    <div className="grid gap-5">
      <Link
        href={p(`/community/${creator.slug}/members`)}
        className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <Icon name="arrowLeft" size={15} />
        {t.circle.backToMembers}
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar src={user.profile?.avatarUrl} name={name} size={88} />
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 text-[1.35rem] font-bold tracking-tight">
              {name}
              {member.role === "OWNER" && <Badge tone="brand">{t.circle.owner}</Badge>}
              {member.role === "ADMIN" && <Badge tone="success">{t.circle.admin}</Badge>}
              {isSelf && <Badge>{t.circle.you}</Badge>}
            </h2>
            {user.profile?.headline && (
              <p className="mt-0.5 text-[14px] text-ink-muted">{user.profile.headline}</p>
            )}
            <p className="mt-1 text-[12.5px] text-ink-subtle">
              {fill(t.circle.level, { n: String(level.level) })} ·{" "}
              {fill(t.circle.joined, { date: formatDate(member.joinedAt, locale) })}
              {user.profile?.city ? ` · ${user.profile.city}` : ""}
            </p>
            {user.profile?.bio && (
              <p className="mt-3 max-w-prose whitespace-pre-line text-[14px] leading-relaxed text-ink">
                {user.profile.bio}
              </p>
            )}

            <div className="mt-4">
              {isSelf ? (
                <p className="text-[13px] text-ink-muted">
                  <span className="font-semibold tabular-nums text-ink">{followers}</span>{" "}
                  {t.circle.followers} ·{" "}
                  <span className="font-semibold tabular-nums text-ink">{following}</span>{" "}
                  {t.circle.followingCount}
                </p>
              ) : (
                <MemberActions
                  userId={userId}
                  initiallyFollowing={Boolean(viewerFollows)}
                  initialFollowers={followers}
                  messageHref={p(`/dashboard/messages/${userId}`)}
                  labels={{
                    follow: t.circle.follow,
                    following: t.circle.following,
                    message: t.circle.message,
                    followers: t.circle.followers,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-bold">{t.circle.contributionsTitle}</h3>
          {rank > 0 && <span className="text-[12.5px] font-semibold text-ink-muted">#{rank}</span>}
        </div>
        <div className="mt-3">
          <ProgressBar value={level.progress} />
          <p className="mt-1.5 text-[12px] text-ink-subtle">
            {fill(t.circle.level, { n: String(level.level) })}
            {level.nextAt !== null ? ` · ${formatNumber(member.points)} / ${formatNumber(level.nextAt)}` : ""}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-sunken/60 px-3 py-2.5">
              <dt className="text-[11.5px] font-medium text-ink-muted">{s.label}</dt>
              <dd className="mt-0.5 text-[18px] font-bold tabular-nums">{formatNumber(s.value)}</dd>
            </div>
          ))}
        </dl>

        {recent.length === 0 ? (
          <p className="mt-5 text-[13.5px] text-ink-muted">{t.circle.contributionsEmpty}</p>
        ) : (
          <ul className="mt-5 grid gap-2">
            {recent.map((post) => (
              <li key={post.id} className="rounded-xl border border-line px-4 py-3">
                {post.title && <p className="text-[14px] font-semibold">{post.title}</p>}
                <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
                  {post.body}
                </p>
                <p className="mt-1.5 flex items-center gap-3 text-[12px] text-ink-subtle">
                  <span>{relativeTime(post.createdAt, locale)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="heart" size={12} /> {post.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="message" size={12} /> {post.replyCount}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-[15px] font-bold">{t.circle.membershipsTitle}</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {circles.map((c) => (
            <li key={c.creatorId}>
              <Link
                href={p(`/community/${c.slug}`)}
                className="flex items-center gap-3 rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-sunken/60"
              >
                <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  {c.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
                    <img src={c.coverUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{c.name}</span>
                  <span className="block text-[12px] text-ink-subtle">
                    {c.role === "OWNER" ? t.circle.owner : c.role === "ADMIN" ? t.circle.admin : t.circle.memberRole}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-ink-subtle">
          {fill(t.circle.memberSince, { date: formatDate(user.createdAt, locale) })}
        </p>
      </Card>
    </div>
  );
}
