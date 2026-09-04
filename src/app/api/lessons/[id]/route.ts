import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { updateLessonSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { refreshCourseAggregates } from "@/lib/progress";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function authorizeLesson(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, moduleId: true, assetKey: true, captionsKey: true },
  });
  if (!lesson) throw notFoundError("გაკვეთილი ვერ მოიძებნა");
  const { user } = await requireCourseOwner(lesson.courseId);
  return { lesson, user };
}

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { lesson, user } = await authorizeLesson(id);
  await beginMutation("write", user.id);

  const body = await readJson(request, updateLessonSchema);

  // Moving a lesson between modules is only allowed within the same course.
  if (body.moduleId && body.moduleId !== lesson.moduleId) {
    const target = await db.courseModule.findUnique({
      where: { id: body.moduleId },
      select: { courseId: true },
    });
    if (!target || target.courseId !== lesson.courseId) {
      throw notFoundError("მოდული ვერ მოიძებნა");
    }
  }

  const updated = await db.lesson.update({
    where: { id },
    data: {
      moduleId: body.moduleId,
      title: body.title,
      description: body.description === "" ? null : body.description,
      type: body.type,
      textContent: body.textContent === "" ? null : body.textContent,
      isFreePreview: body.isFreePreview,
      isPublished: body.isPublished,
      durationSeconds: body.durationSeconds,
    },
    select: {
      id: true, title: true, description: true, type: true, moduleId: true,
      isFreePreview: true, isPublished: true, durationSeconds: true,
      textContent: true, assetKey: true, sortOrder: true,
    },
  });

  await refreshCourseAggregates(lesson.courseId);
  return jsonOk(updated);
});

export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const { lesson, user } = await authorizeLesson(id);
  await beginMutation("write", user.id);

  await db.lesson.delete({ where: { id } });

  // Reclaim the storage the lesson owned; failures here must not fail the
  // delete, so they are swallowed after the row is gone.
  for (const key of [lesson.assetKey, lesson.captionsKey]) {
    if (key) await storage().delete(key).catch(() => undefined);
  }

  await refreshCourseAggregates(lesson.courseId);
  return jsonOk({ ok: true });
});
