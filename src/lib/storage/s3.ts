import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";
import type { ReadRange, ReadResult, StorageDriver, StoredObject } from "./types";
import { isPublicKey } from "./types";
import { guessMime } from "./local";

/**
 * S3-compatible driver (AWS S3, Cloudflare R2, Backblaze B2, MinIO, Wasabi).
 *
 * Requests are signed with SigV4 using node:crypto and fetch(), so the app
 * pulls in no AWS SDK — a meaningful bundle/cold-start saving for a driver
 * that only needs GET/PUT/HEAD/DELETE.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3";

  constructor(
    private readonly cfg = {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
    },
  ) {
    if (!cfg.endpoint || !cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
      throw new Error(
        "STORAGE_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY. See .env.example.",
      );
    }
  }

  private objectUrl(key: string): string {
    const base = this.cfg.endpoint.replace(/\/+$/, "");
    return `${base}/${this.cfg.bucket}/${encodeKey(key)}`;
  }

  /** AWS Signature Version 4 for a single request. */
  private sign(
    method: string,
    key: string,
    payload: Buffer | "UNSIGNED-PAYLOAD",
    extraHeaders: Record<string, string> = {},
  ): { url: string; headers: Record<string, string> } {
    const url = new URL(this.objectUrl(key));
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash =
      payload === "UNSIGNED-PAYLOAD"
        ? "UNSIGNED-PAYLOAD"
        : createHash("sha256").update(payload).digest("hex");

    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...Object.fromEntries(Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])),
    };

    const signedHeaderNames = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaderNames.map((h) => `${h}:${headers[h]!.trim()}\n`).join("");
    const signedHeaders = signedHeaderNames.join(";");

    const canonicalRequest = [
      method,
      url.pathname,
      url.searchParams.toString(),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const hmac = (k: Buffer | string, d: string) => createHmac("sha256", k).update(d).digest();
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${this.cfg.secretAccessKey}`, dateStamp), this.cfg.region), "s3"),
      "aws4_request",
    );
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { url: url.toString(), headers };
  }

  async put(key: string, data: Buffer | Uint8Array, mimeType: string): Promise<StoredObject> {
    const body = Buffer.from(data);
    const { url, headers } = this.sign("PUT", key, body, {
      "content-type": mimeType,
      "content-length": String(body.byteLength),
    });
    const res = await fetch(url, { method: "PUT", headers, body });
    if (!res.ok) throw new Error(`S3 PUT ${key} failed: ${res.status} ${await res.text()}`);
    return { key, size: body.byteLength, mimeType, publicUrl: this.publicUrl(key) };
  }

  async head(key: string) {
    const { url, headers } = this.sign("HEAD", key, Buffer.alloc(0));
    const res = await fetch(url, { method: "HEAD", headers });
    if (!res.ok) return null;
    return {
      size: Number(res.headers.get("content-length") ?? 0),
      mimeType: res.headers.get("content-type") ?? guessMime(key),
    };
  }

  async get(key: string, range?: ReadRange): Promise<ReadResult | null> {
    const extra: Record<string, string> = range
      ? { range: `bytes=${range.start}-${range.end}` }
      : {};
    const { url, headers } = this.sign("GET", key, Buffer.alloc(0), extra);
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok || !res.body) return null;
    const contentRange = res.headers.get("content-range") ?? undefined;
    return {
      body: res.body,
      size: Number(res.headers.get("content-length") ?? 0),
      mimeType: res.headers.get("content-type") ?? guessMime(key),
      contentRange,
      status: res.status === 206 ? 206 : 200,
    };
  }

  async delete(key: string): Promise<void> {
    const { url, headers } = this.sign("DELETE", key, Buffer.alloc(0));
    await fetch(url, { method: "DELETE", headers });
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }

  publicUrl(key: string): string | null {
    // Paid media is never handed a direct CDN URL — it must be proxied so
    // entitlement is checked on every byte range.
    if (!isPublicKey(key)) return null;
    if (!this.cfg.publicBaseUrl) return `/api/files/${key}`;
    return `${this.cfg.publicBaseUrl.replace(/\/+$/, "")}/${encodeKey(key)}`;
  }
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
