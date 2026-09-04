import { headers } from "next/headers";
import { env } from "@/lib/env";
import { anonymousKey } from "@/lib/crypto";

/**
 * Fixed-window rate limiter.
 *
 * The in-process store is correct for a single Node instance and is what dev
 * and a single-container deployment need. `RateLimitStore` is the seam: point
 * `setRateLimitStore()` at Redis/Upstash when the app runs on more than one
 * instance, and no call site changes.
 */

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async hit(key: string, windowMs: number) {
    const now = Date.now();
    // Opportunistic sweep so the map cannot grow without bound.
    if (now - this.lastSweep > 60_000) {
      for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
      this.lastSweep = now;
    }
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }
}

let store: RateLimitStore = new MemoryStore();
export const setRateLimitStore = (s: RateLimitStore) => {
  store = s;
};

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

/** Named policies, so limits are reviewable in one place. */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 10 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  checkout: { limit: 20, windowMs: 10 * 60_000 },
  write: { limit: 120, windowMs: 60_000 },
  upload: { limit: 60, windowMs: 60 * 60_000 },
  search: { limit: 90, windowMs: 60_000 },
  review: { limit: 10, windowMs: 60 * 60_000 },
  comment: { limit: 30, windowMs: 60 * 60_000 },
  webhook: { limit: 600, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/** Caller identity for limiting: the user when known, else a hashed client key. */
export async function clientKey(userId?: string | null): Promise<string> {
  if (userId) return `u:${userId}`;
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = env.TRUST_PROXY && fwd ? fwd.split(",")[0]!.trim() : (h.get("x-real-ip") ?? "local");
  return `a:${anonymousKey(ip, h.get("user-agent"))}`;
}

export async function rateLimit(
  name: RateLimitName,
  identity: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  if (!env.RATE_LIMIT_ENABLED) {
    return { ok: true, remaining: rule.limit, resetAt: Date.now(), retryAfterSeconds: 0 };
  }
  const { count, resetAt } = await store.hit(`${name}:${identity}`, rule.windowMs);
  const ok = count <= rule.limit;
  return {
    ok,
    remaining: Math.max(rule.limit - count, 0),
    resetAt,
    retryAfterSeconds: ok ? 0 : Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1),
  };
}

/** Convenience: limit by session user or client fingerprint in one call. */
export async function rateLimitRequest(name: RateLimitName, userId?: string | null) {
  return rateLimit(name, await clientKey(userId));
}
