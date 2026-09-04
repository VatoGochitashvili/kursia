/**
 * Storage provider contract.
 *
 * Callers only ever hold an opaque `key` (e.g. "courses/abc/lessons/def.mp4").
 * They never build URLs, so swapping local disk for S3/R2/Bunny is a config
 * change. Large binaries never touch the relational database.
 */

export interface StoredObject {
  key: string;
  size: number;
  mimeType: string;
  /** Only set for publicly-served assets (thumbnails). Never for paid media. */
  publicUrl: string | null;
}

export interface ReadRange {
  start: number;
  end: number;
}

export interface ReadResult {
  /** Node stream or buffer, ready to hand to a Response. */
  body: ReadableStream<Uint8Array>;
  size: number;
  mimeType: string;
  /** Set when the driver honoured a Range request. */
  contentRange?: string;
  status: 200 | 206;
}

export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Buffer | Uint8Array, mimeType: string): Promise<StoredObject>;
  get(key: string, range?: ReadRange): Promise<ReadResult | null>;
  head(key: string): Promise<{ size: number; mimeType: string } | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /**
   * A URL the browser may fetch directly. Returns null for drivers/keys that
   * must be proxied through the app (all paid content).
   */
  publicUrl(key: string): string | null;
}

/** Keys are namespaced so retention/CDN rules can differ per kind. */
export const STORAGE_PREFIX = {
  avatar: "avatars",
  thumbnail: "thumbnails",
  coursePreview: "previews",
  lessonVideo: "lessons/video",
  lessonPdf: "lessons/pdf",
  lessonFile: "lessons/file",
  captions: "captions",
  resource: "resources",
  submission: "submissions",
  certificate: "certificates",
} as const;

export type StoragePrefix = (typeof STORAGE_PREFIX)[keyof typeof STORAGE_PREFIX];

/** Prefixes whose objects may be served publicly without a signed grant. */
export const PUBLIC_PREFIXES: string[] = [
  STORAGE_PREFIX.avatar,
  STORAGE_PREFIX.thumbnail,
  STORAGE_PREFIX.coursePreview,
];

export const isPublicKey = (key: string) =>
  PUBLIC_PREFIXES.some((p) => key.startsWith(`${p}/`));
