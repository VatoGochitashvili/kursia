import { buildStorageKey, storage } from "@/lib/storage";
import { issueMediaGrant, mediaUrl } from "@/lib/media-grant";
import type { PlaybackSource, UploadTarget, VideoProvider } from "./types";

/**
 * Default provider: the video lives in our own object storage and is streamed
 * through /api/media with a signed, user-bound, short-lived grant.
 *
 * Byte-range requests are honoured, so seeking works; the raw storage URL is
 * never exposed to the browser.
 */
export class StorageVideoProvider implements VideoProvider {
  readonly name = "storage";

  async getPlaybackSource(input: {
    assetKey: string;
    userId: string;
    lessonId: string;
    captionsKey?: string | null;
  }): Promise<PlaybackSource> {
    const ttl = 60 * 60 * 3; // long enough for a full lesson without a refresh
    const token = issueMediaGrant(
      { k: input.assetKey, u: input.userId, l: input.lessonId, m: "stream" },
      ttl,
    );
    const captionsUrl = input.captionsKey
      ? mediaUrl(
          issueMediaGrant(
            { k: input.captionsKey, u: input.userId, l: input.lessonId, m: "download" },
            ttl,
          ),
        )
      : null;

    return { url: mediaUrl(token), kind: "mp4", expiresInSeconds: ttl, captionsUrl };
  }

  async createUploadTarget(input: {
    courseId: string;
    lessonId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<UploadTarget> {
    // Bytes are proxied through our upload endpoint so size/type are enforced
    // server-side before anything is persisted.
    return {
      uploadUrl: `/api/uploads/video?lessonId=${encodeURIComponent(input.lessonId)}`,
      assetKey: buildStorageKey("video", input.fileName, { courseId: input.courseId }),
      direct: false,
    };
  }

  async delete(assetKey: string): Promise<void> {
    await storage().delete(assetKey);
  }
}
