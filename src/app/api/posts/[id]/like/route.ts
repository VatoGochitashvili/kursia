import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getMembership } from "@/lib/community";
import { award, revoke } from "@/lib/points";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Liking a post.
 *
 * The counter and the like row move together in a transaction, so the number
 * on screen can never disagree with the rows behind it. Liking twice is a
 * no-op rather than an error — the unique pair makes the second insert fail,
 * and a double-tap is not something to show an error for.
 */
async function authorize(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, creatorId: true, authorId: true },
  });
  if (!post) throw notFoundError("პოსტი ვერ მოიძებნა");

  const membership = await getMembership(userId, post.creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }
  return post;
}

export const POST = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);
  const target = await authorize(id, user.id);

  const existing = await db.postLike.count({ where: { userId: user.id, postId: id } });
  if (existing > 0) {
    const post = await db.post.findUnique({ where: { id }, select: { likeCount: true } });
    return jsonOk({ liked: true, likeCount: post?.likeCount ?? 0 });
  }

  const [, post] = await db.$transaction([
    db.postLike.create({ data: { userId: user.id, postId: id } }),
    db.post.update({ where: { id }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
  ]);

  // The AUTHOR is credited, not the liker — and never for liking themselves,
  // which would make the leaderboard a measure of self-regard.
  if (target.authorId !== user.id) {
    await award({
      creatorId: target.creatorId,
      userId: target.authorId,
      kind: "LIKE_RECEIVED",
      sourceType: "like",
      // Keyed by who gave it, so one person's like pays exactly once.
      sourceId: `${id}:${user.id}`,
    });
  }

  return jsonOk({ liked: true, likeCount: post.likeCount });
});

export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);
  const target = await authorize(id, user.id);

  const removed = await db.postLike.deleteMany({ where: { userId: user.id, postId: id } });
  if (removed.count === 0) {
    const post = await db.post.findUnique({ where: { id }, select: { likeCount: true } });
    return jsonOk({ liked: false, likeCount: post?.likeCount ?? 0 });
  }

  // The point goes with the like. Keeping it would let someone farm points by
  // liking and unliking in a loop.
  if (target.authorId !== user.id) {
    await revoke({
      creatorId: target.creatorId,
      userId: target.authorId,
      sourceType: "like",
      sourceId: `${id}:${user.id}`,
    });
  }

  // Clamped at zero: a counter that has drifted must not go negative and
  // start rendering "-1 likes".
  const post = await db.post.update({
    where: { id },
    data: { likeCount: { decrement: 1 } },
    select: { likeCount: true },
  });
  if (post.likeCount < 0) {
    await db.post.update({ where: { id }, data: { likeCount: 0 } });
    return jsonOk({ liked: false, likeCount: 0 });
  }

  return jsonOk({ liked: false, likeCount: post.likeCount });
});
