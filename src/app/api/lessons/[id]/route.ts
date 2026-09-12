import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { updateLessonSchema } from "@/lib/validation";
import { requireCourseOwner, requireUser } from "@/lib/auth/rbac";
import { refreshCourseAggregates } from "@/lib/progress";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function authorizeLesson(lessonId: string) {
  // Authenticate before touching the database. Looking the lesson up first
  // lets an anonymous caller tell "this id exists" from "it does not" by the
  // status code alone, which is a free existence oracle over every lesson on
  // the platform.
  await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true, courseId: true, moduleId: true, assetKey: true, captionsKey: true,
      resources: { select: { assetKey: true } },
    },
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
  // delete, so they are swallowed after the row is gone. Attachment rows go
  // with the lesson by cascade, but the objects they point at do not — those
  // have to be listed before the delete and removed explicitly, or every
  // deleted lesson strands its downloads in the bucket forever.
  const orphanedKeys = [
    lesson.assetKey,
    lesson.captionsKey,
    ...lesson.resources.map((r) => r.assetKey),
  ];
  for (const key of orphanedKeys) {
    if (key) await storage().delete(key).catch(() => undefined);
  }

  await refreshCourseAggregates(lesson.courseId);
  return jsonOk({ ok: true });
});
