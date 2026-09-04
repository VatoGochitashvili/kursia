import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import type { ReadRange, ReadResult, StorageDriver, StoredObject } from "./types";
import { isPublicKey } from "./types";

/**
 * Local-disk driver for development and small single-server deployments.
 * Files live outside the web root and are served only through the app, so
 * paid media is never reachable by guessing a path.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local";
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(process.cwd(), root);
  }

  /**
   * Resolve a key to an absolute path, refusing anything that escapes the
   * storage root. This is the path-traversal boundary — "../../etc/passwd"
   * and absolute keys both fail here.
   */
  private pathFor(key: string): string {
    if (!key || key.includes("\0")) throw new Error("Invalid storage key");
    const target = resolve(join(this.root, key));
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error("Storage key escapes root");
    }
    return target;
  }

  async put(key: string, data: Buffer | Uint8Array, mimeType: string): Promise<StoredObject> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return { key, size: data.byteLength, mimeType, publicUrl: this.publicUrl(key) };
  }

  async head(key: string) {
    try {
      const s = await stat(this.pathFor(key));
      if (!s.isFile()) return null;
      return { size: s.size, mimeType: guessMime(key) };
    } catch {
      return null;
    }
  }

  async get(key: string, range?: ReadRange): Promise<ReadResult | null> {
    const info = await this.head(key);
    if (!info) return null;
    const path = this.pathFor(key);

    if (range) {
      const start = Math.max(0, range.start);
      const end = Math.min(range.end, info.size - 1);
      if (start > end) return null;
      const stream = Readable.toWeb(
        createReadStream(path, { start, end }),
      ) as ReadableStream<Uint8Array>;
      return {
        body: stream,
        size: end - start + 1,
        mimeType: info.mimeType,
        contentRange: `bytes ${start}-${end}/${info.size}`,
        status: 206,
      };
    }

    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
    return { body: stream, size: info.size, mimeType: info.mimeType, status: 200 };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch {
      // Already gone — deletion is idempotent.
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }

  publicUrl(key: string): string | null {
    // Public assets still go through the app so the local driver needs no
    // static mount; paid media requires a signed grant (see /api/media).
    return isPublicKey(key) ? `/api/files/${key}` : null;
  }
}

const MIME: Record<string, string> = {
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/x-m4v",
  m3u8: "application/vnd.apple.mpegurl", ts: "video/mp2t",
  mp3: "audio/mpeg", m4a: "audio/mp4",
  pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml", avif: "image/avif",
  vtt: "text/vtt", srt: "application/x-subrip", txt: "text/plain",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function guessMime(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}
