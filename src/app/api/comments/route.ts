import { db } from "@/lib/db";
import {
  ApiError, beginMutation, handler, jsonCreated, jsonOk, readJson, notFoundError,
} from "@/lib/api";
import { commentSchema } from "@/lib/validation";
import { requireUser, hasCourseAccess } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Lesson discussion. Only viewers with real access may post, which keeps the
 * discussion area from becoming an open comment-spam target.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("comment", user.id);
  const body = await readJson(request, commentSchema);

  const access = await hasCourseAccess(user.id, body.courseId);
  if (!access.canView) throw new ApiError(403, "FORBIDDEN", "კურსზე წვდომა არ გაქვთ");

  // A reply must belong to the same course as its parent.
  if (body.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: body.parentId },
      select: { courseId: true },
    });
    if (!parent || parent.courseId !== body.courseId) throw notFoundError();
  }

  const comment = await db.comment.create({
    data: {
      userId: user.id,
      courseId: body.courseId,
      lessonId: body.lessonId ?? null,
      parentId: body.parentId ?? null,
      body: body.body,
      isQuestion: body.isQuestion ?? false,
    },
    select: {
      id: true, body: true, createdAt: true, isQuestion: true, likeCount: true, parentId: true,
      user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
  });

  // Notify the parent comment's author, or the creator for a new thread.
  if (body.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: body.parentId },
      select: { userId: true, course: { select: { slug: true } } },
    });
    if (parent && parent.userId !== user.id) {
      await notify({
        userId: parent.userId,
        type: "COMMENT_REPLY",
        title: "ახალი პასუხი თქვენს კომენტარზე",
        body: body.body.slice(0, 120),
        linkUrl: `/learn/${parent.course.slug}${body.lessonId ? `?lesson=${body.lessonId}` : ""}`,
      });
    }
  } else {
    const course = await db.course.findUnique({
      where: { id: body.courseId },
      select: { slug: true, title: true, creator: { select: { userId: true } } },
    });
    if (course && course.creator.userId !== user.id) {
      await notify({
        userId: course.creator.userId,
        type: "NEW_COMMENT",
        title: body.isQuestion ? "ახალი კითხვა კურსზე" : "ახალი კომენტარი კურსზე",
        body: `${course.title}: ${body.body.slice(0, 100)}`,
        linkUrl: `/learn/${course.slug}${body.lessonId ? `?lesson=${body.lessonId}` : ""}`,
      });
    }
  }

  return jsonCreated(comment);
});

export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const id = new URL(request.url).searchParams.get("id") ?? "";

  const comment = await db.comment.findUnique({
    where: { id },
    select: { userId: true, course: { select: { creator: { select: { userId: true } } } } },
  });
  if (!comment) throw notFoundError();

  // Author, course creator, or admin may remove a comment.
  const canDelete =
    comment.userId === user.id ||
    comment.course.creator.userId === user.id ||
    user.role === "ADMIN";
  if (!canDelete) throw new ApiError(403, "FORBIDDEN", "წაშლის უფლება არ გაქვთ");

  await db.comment.update({ where: { id }, data: { status: "REMOVED" } });
  return jsonOk({ ok: true });
});
