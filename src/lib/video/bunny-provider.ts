import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import type { PlaybackSource, UploadTarget, VideoProvider } from "./types";

/**
 * Bunny Stream provider — the pragmatic choice for a Georgian audience:
 * cheap egress, a European PoP footprint, HLS transcoding, and token
 * authentication so a copied playback URL dies quickly.
 *
 * Set VIDEO_DRIVER=bunny plus BUNNY_* credentials to activate. Not exercised
 * without credentials; the contract above is what the app depends on, so
 * switching drivers needs no changes elsewhere.
 */
export class BunnyVideoProvider implements VideoProvider {
  readonly name = "bunny";

  constructor(
    private readonly cfg = {
      libraryId: env.BUNNY_STREAM_LIBRARY_ID,
      apiKey: env.BUNNY_STREAM_API_KEY,
      cdnHostname: env.BUNNY_STREAM_CDN_HOSTNAME,
      tokenKey: env.BUNNY_TOKEN_AUTH_KEY,
    },
  ) {
    if (!cfg.libraryId || !cfg.apiKey || !cfg.cdnHostname) {
      throw new Error(
        "VIDEO_DRIVER=bunny requires BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY and BUNNY_STREAM_CDN_HOSTNAME. See .env.example.",
      );
    }
  }

  async getPlaybackSource(input: { assetKey: string }): Promise<PlaybackSource> {
    const ttl = 60 * 60 * 3;
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const path = `/${input.assetKey}/playlist.m3u8`;

    // Bunny token auth: sha256(securityKey + path + expiry), base64url.
    const token = this.cfg.tokenKey
      ? createHash("sha256")
          .update(`${this.cfg.tokenKey}${path}${expires}`)
          .digest("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "")
      : null;

    const query = token ? `?token=${token}&expires=${expires}` : "";
    return {
      url: `https://${this.cfg.cdnHostname}${path}${query}`,
      kind: "hls",
      expiresInSeconds: ttl,
      poster: `https://${this.cfg.cdnHostname}/${input.assetKey}/thumbnail.jpg`,
    };
  }

  async createUploadTarget(input: { fileName: string }): Promise<UploadTarget> {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${this.cfg.libraryId}/videos`,
      {
        method: "POST",
        headers: { AccessKey: this.cfg.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.fileName }),
      },
    );
    if (!res.ok) throw new Error(`Bunny create video failed: ${res.status}`);
    const created = (await res.json()) as { guid: string };
    return {
      uploadUrl: `https://video.bunnycdn.com/library/${this.cfg.libraryId}/videos/${created.guid}`,
      assetKey: created.guid,
      headers: { AccessKey: this.cfg.apiKey },
      direct: false,
    };
  }

  async delete(assetKey: string): Promise<void> {
    await fetch(`https://video.bunnycdn.com/library/${this.cfg.libraryId}/videos/${assetKey}`, {
      method: "DELETE",
      headers: { AccessKey: this.cfg.apiKey },
    });
  }
}
