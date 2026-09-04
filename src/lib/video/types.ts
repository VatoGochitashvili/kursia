/**
 * Video provider contract.
 *
 * The learning UI asks for a "playback source" and gets back a URL plus a
 * kind. It never learns where the bytes physically live, so moving from
 * self-hosted MP4 to Bunny Stream or Mux later touches only this folder.
 */

export type PlaybackKind = "mp4" | "hls" | "dash";

export interface PlaybackSource {
  url: string;
  kind: PlaybackKind;
  /** Seconds until `url` stops working, for client-side refresh. */
  expiresInSeconds: number;
  captionsUrl?: string | null;
  poster?: string | null;
}

export interface UploadTarget {
  /** Where the client (or server) should send the bytes. */
  uploadUrl: string;
  /** Provider-side identifier to persist on the lesson as `assetKey`. */
  assetKey: string;
  /** Extra headers/fields required by the provider. */
  headers?: Record<string, string>;
  /** True when the browser may upload directly, bypassing our server. */
  direct: boolean;
}

export interface VideoProvider {
  readonly name: string;
  /**
   * Issue a playback source for a viewer the server has ALREADY authorised.
   * Providers must never be asked to make the access decision.
   */
  getPlaybackSource(input: {
    assetKey: string;
    userId: string;
    lessonId: string;
    captionsKey?: string | null;
  }): Promise<PlaybackSource>;

  createUploadTarget(input: {
    courseId: string;
    lessonId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<UploadTarget>;

  delete(assetKey: string): Promise<void>;
}
