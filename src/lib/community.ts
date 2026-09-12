import { db } from "@/lib/db";

/**
 * A creator's community: who belongs, and what they can see.
 *
 * Membership is earned by buying, not by signing up. Anyone holding a live
 * enrolment on any course this creator sells is a member; the creator is a
 * member of their own space; an admin can moderate anywhere. Nobody else can
 * read a post, let alone write one.
 *
 * That rule lives here alone. Every route asks this function rather than
 * re-deriving it, because a feed, a reply and a like each need the same
 * answer and three implementations would eventually give three answers.
 */

export interface Membership {
  isMember: boolean;
  /** The creator themselves — may pin, hide and moderate. */
  isOwner: boolean;
  isAdmin: boolean;
}

export async function getMembership(
  userId: string | null,
  creatorId: string,
): Promise<Membership> {
  if (!userId) return { isMember: false, isOwner: false, isAdmin: false };

  const [user, creator] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, creatorProfile: { select: { id: true } } },
    }),
    db.creatorProfile.findUnique({ where: { id: creatorId }, select: { id: true } }),
  ]);

  if (!user || user.status !== "ACTIVE" || !creator) {
    return { isMember: false, isOwner: false, isAdmin: false };
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner = user.creatorProfile?.id === creatorId;
  if (isOwner || isAdmin) return { isMember: true, isOwner, isAdmin };

  // A live enrolment on anything this creator sells. `accessExpiresAt` is
  // compared here for the same reason it is in hasCourseAccess: a lapsed
  // monthly subscriber is not a current member, and waiting for the cron to
  // notice would leave them posting for up to ten minutes after they stopped
  // paying.
  const now = new Date();
  const enrolment = await db.enrollment.count({
    where: {
      userId,
      revokedAt: null,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
      course: { creatorId },
    },
  });

  return { isMember: enrolment > 0, isOwner: false, isAdmin: false };
}

/** What a feed row needs. Replies are counted, not loaded. */
export const POST_SELECT = {
  id: true,
  title: true,
  body: true,
  isPinned: true,
  status: true,
  likeCount: true,
  replyCount: true,
  createdAt: true,
  parentId: true,
  author: {
    select: {
      id: true,
      profile: { select: { fullName: true, username: true, avatarUrl: true } },
      creatorProfile: { select: { slug: true, displayName: true, isVerified: true } },
    },
  },
  course: { select: { slug: true, title: true } },
} as const;

/**
 * Posts a member may see, newest first, pinned above everything.
 *
 * REMOVED posts are excluded for everyone. HIDDEN ones stay visible to the
 * moderator who hid them and to the author, so neither is left wondering
 * where a post went.
 */
export async function loadFeed(input: {
  creatorId: string;
  viewerId: string | null;
  membership: Membership;
  courseId?: string;
  cursor?: string;
  take?: number;
}) {
  const take = Math.min(input.take ?? 20, 50);
  const canSeeHidden = input.membership.isOwner || input.membership.isAdmin;

  const posts = await db.post.findMany({
    where: {
      creatorId: input.creatorId,
      parentId: null,
      ...(input.courseId ? { courseId: input.courseId } : {}),
      ...(canSeeHidden
        ? { status: { not: "REMOVED" } }
        : {
            OR: [
              { status: "VISIBLE" },
              ...(input.viewerId ? [{ status: "HIDDEN", authorId: input.viewerId }] : []),
            ],
          }),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: POST_SELECT,
  });

  const hasMore = posts.length > take;
  const page = hasMore ? posts.slice(0, take) : posts;

  // Which of these the viewer has liked — one query for the page, rather
  // than a `likes: { where: { userId } }` sub-select on every row.
  const liked = input.viewerId
    ? new Set(
        (
          await db.postLike.findMany({
            where: { userId: input.viewerId, postId: { in: page.map((p) => p.id) } },
            select: { postId: true },
          })
        ).map((l) => l.postId),
      )
    : new Set<string>();

  return {
    posts: page.map((post) => ({ ...post, likedByViewer: liked.has(post.id) })),
    nextCursor: hasMore ? page[page.length - 1]?.id : null,
  };
}
