import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";

export const runtime = "nodejs";

/** Toggle a like. `likeCount` stays in step inside the same transaction. */
export const POST = handler(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { id } = await context.params;

  const comment = await db.comment.findUnique({ where: { id }, select: { id: true } });
  if (!comment) throw notFoundError();

  const existing = await db.commentLike.findUnique({
    where: { userId_commentId: { userId: user.id, commentId: id } },
    select: { id: true },
  });

  if (existing) {
    await db.$transaction([
      db.commentLike.delete({ where: { id: existing.id } }),
      db.comment.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return jsonOk({ liked: false });
  }

  await db.$transaction([
    db.commentLike.create({ data: { userId: user.id, commentId: id } }),
    db.comment.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
  ]);
  return jsonOk({ liked: true });
});
