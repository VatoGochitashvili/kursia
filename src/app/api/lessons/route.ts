import { db } from "@/lib/db";
import { beginMutation, handler, jsonCreated, jsonOk, notFoundError, readJson } from "@/lib/api";
import { lessonSchema, reorderSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { refreshCourseAggregates } from "@/lib/progress";

export const runtime = "nodejs";

/** Create a lesson at the end of a module. */
export const POST = handler(async (request) => {
  const body = await readJson(request, lessonSchema);

  const module = await db.courseModule.findUnique({
    where: { id: body.moduleId },
    select: { id: true, courseId: true },
  });
  if (!module) throw notFoundError("მოდული ვერ მოიძებნა");

  const { user } = await requireCourseOwner(module.courseId);
  await beginMutation("write", user.id);

  // Ordering is course-wide so "next lesson" crosses module boundaries.
  const last = await db.lesson.findFirst({
    where: { courseId: module.courseId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const lesson = await db.lesson.create({
    data: {
      courseId: module.courseId,
      moduleId: module.id,
      title: body.title,
      description: body.description ?? null,
      type: body.type,
      textContent: body.textContent ?? null,
      isFreePreview: body.isFreePreview ?? false,
      isPublished: body.isPublished ?? true,
      durationSeconds: body.durationSeconds ?? 0,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      // A quiz lesson needs a quiz shell to edit.
      ...(body.type === "QUIZ"
        ? { quiz: { create: { title: body.title, passingScore: 70 } } }
        : {}),
    },
    select: {
      id: true, title: true, type: true, sortOrder: true, moduleId: true,
      isFreePreview: true, isPublished: true, durationSeconds: true, assetKey: true,
    },
  });

  await refreshCourseAggregates(module.courseId);
  return jsonCreated(lesson);
});

/** Reorder lessons across the whole course (drag between modules). */
export const PATCH = handler(async (request) => {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const { user } = await requireCourseOwner(courseId);
  await beginMutation("write", user.id);

  const { ids } = await readJson(request, reorderSchema);
  const owned = await db.lesson.findMany({
    where: { courseId, id: { in: ids } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((l) => l.id));

  await db.$transaction(
    ids
      .filter((lessonId) => ownedIds.has(lessonId))
      .map((lessonId, index) =>
        db.lesson.update({ where: { id: lessonId }, data: { sortOrder: index } }),
      ),
  );

  return jsonOk({ ok: true });
});
