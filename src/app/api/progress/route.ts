import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, readJson, notFoundError } from "@/lib/api";
import { progressSchema } from "@/lib/validation";
import { requireUser, hasCourseAccess } from "@/lib/auth/rbac";
import { saveLessonProgress } from "@/lib/progress";

export const runtime = "nodejs";

/**
 * Records watch position / completion for one lesson.
 *
 * Progress is only ever recorded for a lesson the caller is actually entitled
 * to, and the courseId is derived from the lesson server-side — a client
 * cannot claim progress on a course it does not own.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, progressSchema);

  const lesson = await db.lesson.findUnique({
    where: { id: body.lessonId },
    select: { id: true, courseId: true, isPublished: true },
  });
  if (!lesson || !lesson.isPublished) throw notFoundError("გაკვეთილი ვერ მოიძებნა");

  const access = await hasCourseAccess(user.id, lesson.courseId);
  // Free previews are watchable, but they do not accumulate course progress —
  // otherwise a non-buyer could "complete" a course.
  if (!access.enrolled) {
    if (!access.canView) throw new ApiError(403, "FORBIDDEN", "კურსზე წვდომა არ გაქვთ");
    return jsonOk({ tracked: false });
  }

  const snapshot = await saveLessonProgress({
    userId: user.id,
    courseId: lesson.courseId,
    lessonId: lesson.id,
    positionSeconds: body.positionSeconds,
    watchedSeconds: body.watchedSeconds,
    isCompleted: body.isCompleted,
  });

  return jsonOk({ tracked: true, ...snapshot });
});
