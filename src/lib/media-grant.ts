import { env } from "@/lib/env";
import { readSignedPayload, signPayload } from "@/lib/crypto";

/**
 * Short-lived, single-purpose access grants for protected media.
 *
 * A grant binds together: the storage key, the user it was issued to, the
 * lesson it belongs to, and an expiry. It is HMAC-signed, so it cannot be
 * edited to point at another file. Because it also carries the user id, a
 * grant copied out of devtools and pasted elsewhere still only works while
 * that user's session is the one presenting it (see /api/media route).
 *
 * This is what makes "casual sharing of course video URLs" ineffective: the
 * URL a student can see expires in minutes and is bound to their account.
 */

const GRANT_TTL_SECONDS = 60 * 15;

export interface MediaGrant {
  /** storage key */
  k: string;
  /** user id the grant was issued to */
  u: string;
  /** lesson id (or "preview:<courseId>" for public previews) */
  l: string;
  /** expiry, unix seconds */
  e: number;
  /** "stream" for video/audio, "download" for attachments */
  m: "stream" | "download";
}

export function issueMediaGrant(
  grant: Omit<MediaGrant, "e">,
  ttlSeconds = GRANT_TTL_SECONDS,
): string {
  const payload: MediaGrant = { ...grant, e: Math.floor(Date.now() / 1000) + ttlSeconds };
  return signPayload(JSON.stringify(payload), env.MEDIA_SIGNING_SECRET);
}

export function readMediaGrant(token: string): MediaGrant | null {
  const raw = readSignedPayload(token, env.MEDIA_SIGNING_SECRET);
  if (!raw) return null;
  try {
    const g = JSON.parse(raw) as MediaGrant;
    if (typeof g.k !== "string" || typeof g.u !== "string" || typeof g.e !== "number") return null;
    if (g.e < Math.floor(Date.now() / 1000)) return null;
    return g;
  } catch {
    return null;
  }
}

/** URL the player/browser requests. Always relative — proxied by the app. */
export const mediaUrl = (token: string) => `/api/media/${token}`;
