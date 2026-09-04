import { db } from "@/lib/db";
import { handler, jsonOk, notFoundError } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { hasCourseAccess } from "@/lib/auth/rbac";
import { ApiError } from "@/lib/api";
import { videoProvider } from "@/lib/video";
import { issueMediaGrant, mediaUrl } from "@/lib/media-grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues a short-lived playback source for one lesson.
 *
 * Entitlement is decided HERE, on the server, before the provider is asked for
 * anything. The client receives a time-limited URL bound to its own account,
 * never a storage path or a provider asset id.
 */
export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: {
      id: true, courseId: true, type: true, assetKey: true, captionsKey: true,
      isFreePreview: true, isPublished: true, durationSeconds: true,
      resources: { select: { id: true, title: true, assetKey: true, sizeBytes: true, mimeType: true } },
    },
  });
  if (!lesson || !lesson.isPublished) throw notFoundError("გაკვეთილი ვერ მოიძებნა");

  const access = await hasCourseAccess(user.id, lesson.courseId);
  if (!access.canView && !lesson.isFreePreview) {
    throw new ApiError(403, "FORBIDDEN", "კურსზე წვდომა არ გაქვთ");
  }

  const source =
    lesson.assetKey && lesson.type === "VIDEO"
      ? await videoProvider().getPlaybackSource({
          assetKey: lesson.assetKey,
          userId: user.id,
          lessonId: lesson.id,
          captionsKey: lesson.captionsKey,
        })
      : null;

  // Downloadable resources get their own per-user grants.
  const resources = lesson.resources.map((r) => ({
    id: r.id,
    title: r.title,
    sizeBytes: r.sizeBytes,
    mimeType: r.mimeType,
    url: mediaUrl(
      issueMediaGrant({ k: r.assetKey, u: user.id, l: lesson.id, m: "download" }, 60 * 30),
    ),
  }));

  // A PDF lesson streams through the same protected route as video.
  const documentUrl =
    lesson.assetKey && (lesson.type === "PDF" || lesson.type === "FILE")
      ? mediaUrl(
          issueMediaGrant({ k: lesson.assetKey, u: user.id, l: lesson.id, m: "stream" }, 60 * 60),
        )
      : null;

  return jsonOk({ source, resources, documentUrl, durationSeconds: lesson.durationSeconds });
});
