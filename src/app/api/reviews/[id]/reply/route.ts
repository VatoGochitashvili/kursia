import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

/**
 * Creator's public reply to a review.
 * Only the creator who owns the reviewed course (or an admin) may reply.
 */
export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { id } = await context.params;

  const review = await db.review.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      course: { select: { title: true, slug: true, creator: { select: { userId: true } } } },
    },
  });
  if (!review) throw notFoundError("შეფასება ვერ მოიძებნა");

  const isOwner = review.course.creator.userId === user.id;
  if (!isOwner && user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "პასუხის უფლება არ გაქვთ");
  }

  const { body } = await readJson(request, bodySchema);

  await db.review.update({
    where: { id },
    data: { creatorReply: body, creatorRepliedAt: new Date() },
  });

  await notify({
    userId: review.userId,
    type: "REVIEW_REPLY",
    title: "ინსტრუქტორმა უპასუხა თქვენს შეფასებას",
    body: review.course.title,
    linkUrl: `/courses/${review.course.slug}`,
  });

  return jsonOk({ ok: true });
});
