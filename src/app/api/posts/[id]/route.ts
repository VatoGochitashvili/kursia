import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getMembership } from "@/lib/community";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Editing, moderating and deleting one post.
 *
 * Two different permissions sit here and are kept apart on purpose:
 *
 *  • The AUTHOR may edit their own words and delete their own post.
 *  • The CREATOR (or an admin) may pin and hide anything in their space, but
 *    may not rewrite what somebody else said. Putting words in a member's
 *    mouth is not moderation.
 */
async function load(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, creatorId: true, authorId: true, parentId: true, status: true },
  });
  if (!post) throw notFoundError("პოსტი ვერ მოიძებნა");

  const membership = await getMembership(userId, post.creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }
  return { post, membership };
}

const patchSchema = z
  .object({
    body: z.string().trim().min(1).max(10000).optional(),
    title: z.string().trim().max(160).nullable().optional(),
    isPinned: z.boolean().optional(),
    status: z.enum(["VISIBLE", "HIDDEN"]).optional(),
  })
  .strict();

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);

  const { post, membership } = await load(id, user.id);
  const input = await readJson(request, patchSchema);

  const isAuthor = post.authorId === user.id;
  const canModerate = membership.isOwner || membership.isAdmin;

  if ((input.body !== undefined || input.title !== undefined) && !isAuthor) {
    throw new ApiError(403, "FORBIDDEN", "მხოლოდ ავტორს შეუძლია ტექსტის შეცვლა");
  }
  if ((input.isPinned !== undefined || input.status !== undefined) && !canModerate) {
    throw new ApiError(403, "FORBIDDEN", "მოდერაციის უფლება არ გაქვთ");
  }

  const updated = await db.post.update({
    where: { id },
    data: {
      ...(input.body !== undefined ? { body: input.body } : {}),
      // A reply never carries a title, however it is edited.
      ...(input.title !== undefined && !post.parentId ? { title: input.title } : {}),
      ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    select: { id: true, body: true, title: true, isPinned: true, status: true },
  });

  return jsonOk({ post: updated });
});

export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);

  const { post, membership } = await load(id, user.id);
  const canDelete = post.authorId === user.id || membership.isOwner || membership.isAdmin;
  if (!canDelete) throw new ApiError(403, "FORBIDDEN", "წაშლის უფლება არ გაქვთ");

  // Marked REMOVED rather than deleted. A hard delete would take its replies
  // with it by cascade, erasing other people's words because one person
  // changed their mind about theirs.
  await db.post.update({ where: { id }, data: { status: "REMOVED" } });

  if (post.parentId) {
    await db.post.update({
      where: { id: post.parentId },
      data: { replyCount: { decrement: 1 } },
    });
  }

  return jsonOk({ ok: true });
});
