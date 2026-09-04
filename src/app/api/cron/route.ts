import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { handler, jsonError, jsonOk } from "@/lib/api";
import { drainOutbox } from "@/lib/email";
import { clearMaturedEarnings } from "@/lib/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled maintenance. Call from a platform scheduler (Vercel Cron, a
 * systemd timer, GitHub Actions) with:
 *
 *   Authorization: Bearer $AUTH_SECRET
 *
 * Recommended cadence: every 10 minutes.
 *
 * Jobs:
 *  • drainOutbox        — deliver queued transactional email
 *  • clearMaturedEarnings — move cleared sales from pending to withdrawable
 *  • pruneSessions      — delete expired/revoked session rows
 *
 * Each job is independent and idempotent, so a missed or repeated run is safe.
 */
export const POST = handler(async (request) => {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = env.AUTH_SECRET;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return jsonError(401, "UNAUTHORIZED", "Invalid cron token");
  }

  const startedAt = Date.now();

  const [email, earnings, prunedSessions, prunedTokens] = await Promise.all([
    drainOutbox(50),
    clearMaturedEarnings(),
    db.session
      .deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            // Keep revoked sessions briefly for forensics, then drop them.
            { revokedAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
          ],
        },
      })
      .then((r) => r.count),
    db.verificationToken
      .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } })
      .then((r) => r.count),
  ]);

  return jsonOk({
    ok: true,
    durationMs: Date.now() - startedAt,
    email,
    earnings,
    prunedSessions,
    prunedTokens,
  });
});

/** GET mirrors POST so schedulers that only issue GETs still work. */
export const GET = POST;
