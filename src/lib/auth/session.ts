import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, randomToken, readSignedPayload, signPayload } from "@/lib/crypto";
import type { UserRole, UserStatus } from "@/lib/enums";

/**
 * Session design
 * ──────────────
 * The cookie carries an opaque random token, HMAC-signed so a forged value is
 * rejected before it ever reaches the database. The authoritative record lives
 * in the Session table, which means sessions can be revoked server-side
 * (logout everywhere, suspension, password change) — something a stateless JWT
 * cannot do. The token itself is stored only as a SHA-256 hash, so a database
 * leak does not hand out live sessions.
 */

export const SESSION_COOKIE = "kursia_session";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  locale: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  creatorId: string | null;
  creatorSlug: string | null;
  creatorVerified: boolean;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = env.TRUST_PROXY && forwarded ? forwarded.split(",")[0]!.trim() : null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 400) ?? null };
}

/** Issue a session and set the cookie. Call only after credentials verify. */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const { ip, userAgent } = await requestMeta();

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      ip,
      userAgent,
    },
  });

  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    signPayload(token, env.AUTH_SECRET),
    cookieOptions(Math.floor(ttlMs / 1000)),
  );
}

/** Read + validate the current session. Returns null for anonymous visitors. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const token = readSignedPayload(raw, env.AUTH_SECRET);
  if (!token) return null; // forged or tampered cookie — never hits the DB

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          locale: true,
          profile: { select: { fullName: true, username: true, avatarUrl: true } },
          creatorProfile: { select: { id: true, slug: true, isVerified: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  const u = session.user;
  // A suspended or deleted account is treated as anonymous everywhere.
  if (u.status !== "ACTIVE") return null;

  return {
    id: u.id,
    email: u.email,
    role: u.role as UserRole,
    status: u.status as UserStatus,
    emailVerified: Boolean(u.emailVerified),
    locale: u.locale,
    fullName: u.profile?.fullName ?? u.email.split("@")[0]!,
    username: u.profile?.username ?? "",
    avatarUrl: u.profile?.avatarUrl ?? null,
    creatorId: u.creatorProfile?.id ?? null,
    creatorSlug: u.creatorProfile?.slug ?? null,
    creatorVerified: u.creatorProfile?.isVerified ?? false,
  };
}

/** Revoke the current session and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const token = readSignedPayload(raw, env.AUTH_SECRET);
    if (token) {
      await db.session
        .updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } })
        .catch(() => undefined);
    }
  }
  store.delete(SESSION_COOKIE);
}

/** Used after a password change / suspension — invalidates every device. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
