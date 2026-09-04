import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import type { StorageDriver, StoragePrefix } from "./types";
import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";

export * from "./types";
export { guessMime } from "./local";

let instance: StorageDriver | null = null;

/** The configured storage driver. Resolved once, lazily. */
export function storage(): StorageDriver {
  if (instance) return instance;
  instance = env.STORAGE_DRIVER === "s3"
    ? new S3StorageDriver()
    : new LocalStorageDriver(env.STORAGE_LOCAL_ROOT);
  return instance;
}

/** Test/bootstrap seam for injecting a fake driver. */
export const setStorageDriver = (driver: StorageDriver | null) => {
  instance = driver;
};

// ── Upload validation ──────────────────────────────────────────────────────

export interface UploadKind {
  prefix: StoragePrefix;
  maxBytes: number;
  /** Extensions AND mime types must both be allow-listed. */
  extensions: string[];
  mimeTypes: string[];
}

const MB = 1024 * 1024;

export const UPLOAD_KINDS = {
  avatar: {
    prefix: "avatars",
    maxBytes: 4 * MB,
    extensions: ["jpg", "jpeg", "png", "webp", "avif"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  thumbnail: {
    prefix: "thumbnails",
    maxBytes: 8 * MB,
    extensions: ["jpg", "jpeg", "png", "webp", "avif"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  video: {
    prefix: "lessons/video",
    maxBytes: 3000 * MB,
    extensions: ["mp4", "webm", "mov", "m4v"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"],
  },
  pdf: {
    prefix: "lessons/pdf",
    maxBytes: 100 * MB,
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
  },
  captions: {
    prefix: "captions",
    maxBytes: 2 * MB,
    extensions: ["vtt", "srt"],
    mimeTypes: ["text/vtt", "application/x-subrip", "text/plain"],
  },
  resource: {
    prefix: "resources",
    maxBytes: 200 * MB,
    extensions: ["pdf", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "png", "jpg", "jpeg"],
    mimeTypes: [
      "application/pdf", "application/zip", "text/plain", "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/png", "image/jpeg",
    ],
  },
  submission: {
    prefix: "submissions",
    maxBytes: 100 * MB,
    extensions: ["pdf", "zip", "doc", "docx", "png", "jpg", "jpeg", "txt"],
    mimeTypes: [
      "application/pdf", "application/zip", "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png", "image/jpeg",
    ],
  },
} satisfies Record<string, UploadKind>;

export type UploadKindName = keyof typeof UPLOAD_KINDS;

export interface UploadValidationError {
  code: "TOO_LARGE" | "BAD_EXTENSION" | "BAD_MIME" | "EMPTY";
  message: string;
}

/**
 * Reject unsafe uploads before a byte is written.
 *
 * Both the extension and the declared mime type must be allow-listed, and the
 * stored key is generated server-side from a UUID — the client's filename is
 * never used as a path, which removes traversal, overwrite and
 * double-extension (`x.pdf.svg`) attacks in one move. SVG is deliberately not
 * accepted anywhere, since it can carry script.
 */
export function validateUpload(
  kind: UploadKindName,
  file: { name: string; size: number; type: string },
): UploadValidationError | null {
  const spec = UPLOAD_KINDS[kind];
  if (file.size <= 0) return { code: "EMPTY", message: "ფაილი ცარიელია" };
  if (file.size > spec.maxBytes) {
    return {
      code: "TOO_LARGE",
      message: `ფაილი ძალიან დიდია. მაქსიმუმი ${Math.round(spec.maxBytes / MB)}MB`,
    };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!spec.extensions.includes(ext)) {
    return {
      code: "BAD_EXTENSION",
      message: `დაუშვებელი ფორმატი. დასაშვებია: ${spec.extensions.join(", ")}`,
    };
  }
  const mime = file.type.split(";")[0]!.trim().toLowerCase();
  if (mime && !spec.mimeTypes.includes(mime)) {
    return { code: "BAD_MIME", message: `დაუშვებელი ფაილის ტიპი: ${mime}` };
  }
  return null;
}

/** Server-generated storage key. Client filenames never become paths. */
export function buildStorageKey(
  kind: UploadKindName,
  originalName: string,
  scope?: { courseId?: string; userId?: string },
): string {
  const spec = UPLOAD_KINDS[kind];
  const ext = (originalName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const scopePart = scope?.courseId
    ? `c_${scope.courseId}`
    : scope?.userId
      ? `u_${scope.userId}`
      : "shared";
  return `${spec.prefix}/${scopePart}/${randomUUID()}.${ext}`;
}
