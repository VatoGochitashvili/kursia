import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { hasCourseAccess } from "@/lib/auth/rbac";
import { readMediaGrant } from "@/lib/media-grant";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected media streaming — video, captions and downloadable resources.
 *
 * Defence in depth, in order:
 *  1. The grant must carry a valid HMAC and not be expired. A tampered token
 *     (pointing at another file) fails here.
 *  2. The grant must have been issued to the CURRENT session user. This is
 *     what makes a copied URL useless to someone else — pasting it into
 *     another browser hits an anonymous/mismatched session and is refused.
 *  3. Entitlement is re-checked against the database on every request. A
 *     refund revokes the enrolment, and the very next byte range is refused,
 *     even if the student still holds a valid-looking grant.
 *  4. Responses are `private, no-store` and the storage key is never exposed.
 *
 * Byte-range requests are honoured so scrubbing works in the player.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;

  const grant = readMediaGrant(token);
  if (!grant) return deny(403, "Invalid or expired media grant");

  const user = await getSessionUser();
  // Step 2 — the grant is bound to one account.
  if (!user || user.id !== grant.u) return deny(403, "This media link is not valid for you");

  // Step 3 — re-derive entitlement from the database, never from the token.
  const authorized = await isAuthorizedForAsset(grant.l, grant.k, user.id);
  if (!authorized) return deny(403, "No access to this content");

  const head = await storage().head(grant.k);
  if (!head) return deny(404, "Not found");

  const rangeHeader = request.headers.get("range");
  const range = parseRange(rangeHeader, head.size);
  if (rangeHeader && !range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${head.size}`, "Cache-Control": "private, no-store" },
    });
  }

  const result = await storage().get(grant.k, range ?? undefined);
  if (!result) return deny(404, "Not found");

  const headers = new Headers({
    "Content-Type": result.mimeType,
    "Content-Length": String(result.size),
    "Accept-Ranges": "bytes",
    // Never cached by a shared cache: the response is user-specific.
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    // Force a download (never inline execution) for attachments.
    "Content-Disposition":
      grant.m === "download" ? `attachment; filename="${safeFilename(grant.k)}"` : "inline",
  });
  if (result.contentRange) headers.set("Content-Range", result.contentRange);

  return new Response(result.body, { status: result.status, headers });
}

/**
 * Decide whether `userId` may read `assetKey`.
 *
 * The lesson id in the grant is only a lookup hint — the asset key must
 * actually belong to that lesson, so a grant cannot be pointed at a different
 * course's file.
 */
async function isAuthorizedForAsset(
  lessonId: string,
  assetKey: string,
  userId: string,
): Promise<boolean> {
  // Course preview video (marketing asset on the public course page).
  if (lessonId.startsWith("preview:")) {
    const courseId = lessonId.slice("preview:".length);
    const course = await db.course.findFirst({
      where: { id: courseId, status: "PUBLISHED", previewVideoUrl: assetKey },
      select: { id: true },
    });
    return Boolean(course);
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      courseId: true,
      isFreePreview: true,
      isPublished: true,
      assetKey: true,
      captionsKey: true,
      resources: { select: { assetKey: true } },
    },
  });
  if (!lesson) return false;

  // The key must be one this lesson actually owns.
  const ownsKey =
    lesson.assetKey === assetKey ||
    lesson.captionsKey === assetKey ||
    lesson.resources.some((r) => r.assetKey === assetKey);
  if (!ownsKey) return false;

  const access = await hasCourseAccess(userId, lesson.courseId);
  if (access.canView) return true;

  // A free-preview lesson is watchable by any signed-in user, but only while
  // the lesson is published.
  return lesson.isFreePreview && lesson.isPublished;
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;

  if (rawStart === "") {
    // Suffix range: last N bytes.
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || start >= size || end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}

const safeFilename = (key: string) =>
  (key.split("/").pop() ?? "file").replace(/[^A-Za-z0-9._-]/g, "_");

const deny = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { code: "FORBIDDEN", message } }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
