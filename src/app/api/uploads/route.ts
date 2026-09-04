import { db } from "@/lib/db";
import { ApiError, assertSameOrigin, badRequest, guardRate, handler, jsonCreated } from "@/lib/api";
import { requireUser, requireCourseOwner } from "@/lib/auth/rbac";
import {
  buildStorageKey, storage, validateUpload, UPLOAD_KINDS, type UploadKindName,
} from "@/lib/storage";

export const runtime = "nodejs";
// Uploads stream a whole file into memory before writing, so keep the body
// cap aligned with the largest allowed kind.
export const maxDuration = 300;

/**
 * File upload.
 *
 * Security posture:
 *  • The caller must own the target course (or be an admin) for course assets.
 *  • Extension AND declared mime type must both be allow-listed per kind
 *    (`validateUpload`), and SVG is never accepted — it can carry script.
 *  • The stored key is generated server-side from a UUID, so the client's
 *    filename never becomes a path. That removes traversal, overwrite and
 *    double-extension tricks in one move.
 *  • Non-public assets get no public URL at all; they are reachable only via a
 *    signed, user-bound grant through /api/media.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await assertSameOrigin();
  await guardRate("upload", user.id);

  const form = await request.formData().catch(() => null);
  if (!form) throw badRequest("არასწორი მოთხოვნა");

  const file = form.get("file");
  const kindRaw = String(form.get("kind") ?? "");
  const courseId = form.get("courseId") ? String(form.get("courseId")) : undefined;
  const lessonId = form.get("lessonId") ? String(form.get("lessonId")) : undefined;

  if (!(file instanceof File)) throw badRequest("ფაილი არ არის მიმაგრებული");
  if (!(kindRaw in UPLOAD_KINDS)) throw badRequest("უცნობი ფაილის ტიპი");
  const kind = kindRaw as UploadKindName;

  // Course-scoped assets require ownership of that course.
  if (courseId) {
    await requireCourseOwner(courseId);
  } else if (kind !== "avatar") {
    throw badRequest("courseId სავალდებულოა ამ ტიპისთვის");
  }

  // Only creators/admins may upload course material at all.
  if (kind !== "avatar" && kind !== "submission" && user.role === "STUDENT") {
    throw new ApiError(403, "FORBIDDEN", "ატვირთვის უფლება არ გაქვთ");
  }

  const problem = validateUpload(kind, { name: file.name, size: file.size, type: file.type });
  if (problem) throw badRequest(problem.message, { file: [problem.message] });

  const key = buildStorageKey(kind, file.name, { courseId, userId: user.id });
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storage().put(key, bytes, file.type || "application/octet-stream");

  // Attach the asset to the lesson it belongs to, when one was named.
  if (lessonId && (kind === "video" || kind === "pdf" || kind === "captions")) {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true },
    });
    if (!lesson || (courseId && lesson.courseId !== courseId)) {
      throw badRequest("გაკვეთილი ვერ მოიძებნა");
    }
    await requireCourseOwner(lesson.courseId);

    await db.lesson.update({
      where: { id: lessonId },
      data:
        kind === "captions"
          ? { captionsKey: stored.key }
          : {
              assetKey: stored.key,
              assetSizeBytes: stored.size,
              assetMimeType: stored.mimeType,
            },
    });
  }

  return jsonCreated({
    key: stored.key,
    size: stored.size,
    mimeType: stored.mimeType,
    // Only public kinds (avatars, thumbnails) get a directly usable URL.
    url: stored.publicUrl,
  });
});
