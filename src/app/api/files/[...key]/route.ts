import { storage, isPublicKey } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Public asset proxy — thumbnails, avatars and course preview images only.
 *
 * The allow-list check is what keeps this from becoming a hole: only keys
 * under the public prefixes are servable here. Anything else (lesson video,
 * PDFs, resources) must go through /api/media with a signed, user-bound grant,
 * so a crafted /api/files/lessons/video/... path is refused.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key: segments } = await context.params;
  const key = segments.join("/");

  if (!isPublicKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const result = await storage().get(key);
  if (!result) return new Response("Not found", { status: 404 });

  return new Response(result.body, {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Content-Length": String(result.size),
      // Public, immutable: keys contain a UUID, so content never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
