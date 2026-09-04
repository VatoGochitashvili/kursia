import {
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// OWASP-recommended scrypt parameters (N=2^16, r=8, p=1 ≈ 64 MiB).
// scrypt ships with Node, so there is no native build step and no third-party
// crypto dependency in the auth path.
const SCRYPT = { N: 1 << 16, r: 8, p: 1, maxmem: 128 * 1024 * 1024 } as const;
const KEY_LEN = 32;
const SALT_LEN = 16;

/** Returns `scrypt$N$r$p$saltB64$hashB64`. Passwords are never stored raw. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, SCRYPT);
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/** Constant-time verification. Tolerates records written with older params. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** True when a hash should be upgraded to current parameters on next login. */
export function needsRehash(stored: string): boolean {
  const [scheme, n, r, p] = stored.split("$");
  return scheme !== "scrypt" || Number(n) < SCRYPT.N || Number(r) < SCRYPT.r || Number(p) < SCRYPT.p;
}

// ── Opaque tokens ──────────────────────────────────────────────────────────

/** URL-safe random token. Only its hash is persisted. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Deterministic lookup hash for tokens stored in the database. */
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

// ── Detached HMAC signatures (cookies, media grants, certificates) ─────────

export const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = sign(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `payload.signature` — tamper-evident, not encrypted. Never put secrets in. */
export const signPayload = (payload: string, secret: string) =>
  `${Buffer.from(payload).toString("base64url")}.${sign(payload, secret)}`;

export function readSignedPayload(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  return verifySignature(payload, token.slice(dot + 1), secret) ? payload : null;
}

/** Compare two strings without leaking length/content through timing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Human-transcribable code, e.g. KRS-8F2A-91QD. Excludes I/O/0/1. */
export function humanCode(prefix = "KRS", groups = 2, size = 4): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    let s = "";
    for (let i = 0; i < size; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(s);
  }
  return [prefix, ...parts].join("-");
}

/** Non-reversible key for analytics — never store raw IP/UA. */
export const anonymousKey = (...parts: (string | undefined | null)[]) =>
  createHash("sha256").update(parts.filter(Boolean).join("|")).digest("base64url").slice(0, 32);
