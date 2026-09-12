import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { storage } from "@/lib/storage";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Downloadable attachments on one lesson.
 *
 * Creating one happens in the upload route, because the row and the stored
 * object have to appear together — a row pointing at nothing is a broken
 * download, and an object with no row is storage nobody can reach. Renaming
 * and removing live here, where no file is moving.
 *
 * Only the course owner (or an admin) gets past `requireCourseOwner`. Students
 * read attachments through the playback endpoint, which hands out signed,
 * per-user grants rather than keys.
 */
async function authorizeLesson(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson) throw notFoundError("გაკვეთილი ვერ მოიძებნა");
  const { user } = await requireCourseOwner(lesson.courseId);
  return { lesson, user };
}

/** The owner's view: enough to list and manage, never the storage key. */
export const GET = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  await authorizeLesson(id);

  const resources = await db.lessonResource.findMany({
    where: { lessonId: id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, sizeBytes: true, mimeType: true, sortOrder: true },
  });

  return jsonOk({ resources });
});

const renameSchema = z
  .object({ resourceId: cuid, title: z.string().trim().min(1).max(160) })
  .strict();

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { user } = await authorizeLesson(id);
  await beginMutation("write", user.id);

  const body = await readJson(request, renameSchema);

  // Scope the update to this lesson, so a valid id from another course cannot
  // be renamed by someone who merely owns this one.
  const result = await db.lessonResource.updateMany({
    where: { id: body.resourceId, lessonId: id },
    data: { title: body.title },
  });
  if (result.count === 0) throw notFoundError("ფაილი ვერ მოიძებნა");

  return jsonOk({ ok: true });
});

export const DELETE = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { user } = await authorizeLesson(id);
  await beginMutation("write", user.id);

  const resourceId = new URL(request.url).searchParams.get("resourceId") ?? "";
  const resource = await db.lessonResource.findFirst({
    where: { id: resourceId, lessonId: id },
    select: { id: true, assetKey: true },
  });
  if (!resource) throw notFoundError("ფაილი ვერ მოიძებნა");

  await db.lessonResource.delete({ where: { id: resource.id } });

  // Reclaim the object. A failure here leaves an orphan in the bucket, which
  // is wasteful but harmless — far better than refusing a delete the creator
  // has already been told succeeded.
  await storage().delete(resource.assetKey).catch(() => undefined);

  return jsonOk({ ok: true });
});
