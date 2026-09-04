import { db } from "@/lib/db";
import {
  ApiError, beginMutation, handler, jsonCreated, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { reviewSchema } from "@/lib/validation";
import { requireUser, isEnrolled } from "@/lib/auth/rbac";
import { refreshCourseRating } from "@/lib/progress";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Create or update a review.
 *
 * Two rules the platform depends on, both enforced server-side:
 *  1. Only someone who actually OWNS the course may review it. Enrolment is
 *     checked fresh; a refunded (revoked) enrolment does not qualify.
 *  2. One review per user per course. Posting again edits the existing one
 *     rather than creating a duplicate — the DB also has a unique constraint
 *     on (userId, courseId) as a backstop.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("review", user.id);
  const body = await readJson(request, reviewSchema);

  const enrolled = await isEnrolled(user.id, body.courseId);
  if (!enrolled) {
    throw new ApiError(403, "NOT_ENROLLED", "შეფასების დაწერა შეუძლიათ მხოლოდ კურსის მფლობელებს");
  }

  const existing = await db.review.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: body.courseId } },
    select: { id: true },
  });

  const review = existing
    ? await db.review.update({
        where: { id: existing.id },
        data: {
          rating: body.rating,
          title: body.title || null,
          body: body.body || null,
          editedAt: new Date(),
          // An edited review returns to visible; moderation can hide it again.
          status: "VISIBLE",
        },
        select: { id: true, rating: true, title: true, body: true, createdAt: true },
      })
    : await db.review.create({
        data: {
          userId: user.id,
          courseId: body.courseId,
          rating: body.rating,
          title: body.title || null,
          body: body.body || null,
        },
        select: { id: true, rating: true, title: true, body: true, createdAt: true },
      });

  await refreshCourseRating(body.courseId);

  if (!existing) {
    const course = await db.course.findUnique({
      where: { id: body.courseId },
      select: { title: true, slug: true, creator: { select: { userId: true } } },
    });
    if (course) {
      await notify({
        userId: course.creator.userId,
        type: "NEW_REVIEW",
        title: "ახალი შეფასება",
        body: `${course.title} — ${body.rating}★`,
        linkUrl: "/dashboard/creator/reviews",
      });
    }
  }

  return existing ? jsonOk(review) : jsonCreated(review);
});

/** Remove your own review. */
export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const courseId = new URL(request.url).searchParams.get("courseId") ?? "";

  const result = await db.review.deleteMany({ where: { userId: user.id, courseId } });
  if (result.count === 0) throw notFoundError();

  await refreshCourseRating(courseId);
  return jsonOk({ ok: true });
});
