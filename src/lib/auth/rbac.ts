import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "./session";
import type { UserRole } from "@/lib/enums";
import { communityScope } from "@/lib/membership";

/**
 * Authorization helpers. Every one of these runs on the server and reads from
 * the database — the client is never asked whether it may do something, and a
 * role claim in a request body is always ignored.
 */

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const unauthenticated = () =>
  new AuthError("UNAUTHENTICATED", "ავტორიზაცია საჭიროა");
export const forbidden = (msg = "წვდომა შეზღუდულია") => new AuthError("FORBIDDEN", msg);
export const notFound = (msg = "ვერ მოიძებნა") => new AuthError("NOT_FOUND", msg);

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthenticated();
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  // Admins pass every role gate.
  if (user.role === "ADMIN" || roles.includes(user.role)) return user;
  throw forbidden();
}

export const requireAdmin = () => requireRole("ADMIN");

/** A creator account that exists and has not been suspended. */
export async function requireCreator(): Promise<SessionUser & { creatorId: string }> {
  const user = await requireRole("CREATOR");
  if (!user.creatorId) {
    throw forbidden("ინსტრუქტორის პროფილი არ არსებობს");
  }
  return user as SessionUser & { creatorId: string };
}

/** Course ownership check. Admins may act on any course. */
export async function requireCourseOwner(courseId: string) {
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, creatorId: true, status: true, slug: true, title: true },
  });
  if (!course) throw notFound("კურსი ვერ მოიძებნა");
  if (user.role === "ADMIN") return { user, course };
  if (!user.creatorId || course.creatorId !== user.creatorId) throw forbidden();
  return { user, course };
}

/**
 * THE access gate for paid content. Server-side only, always a fresh read.
 * A lesson is unlocked when the user is enrolled, owns the course as its
 * creator, is an admin, or the lesson is explicitly a free preview.
 */
export async function hasCourseAccess(
  userId: string | null,
  courseId: string,
): Promise<{
  enrolled: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canView: boolean;
  /** When a subscription period ends. NULL for anything that never expires. */
  accessExpiresAt: Date | null;
  /** True when the access came from a community membership, not a purchase. */
  viaMembership: boolean;
}> {
  const denied = {
    enrolled: false, isOwner: false, isAdmin: false,
    canView: false, accessExpiresAt: null, viaMembership: false,
  };
  if (!userId) return denied;

  const [user, enrollment, course] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, creatorProfile: { select: { id: true } } },
    }),
    db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, revokedAt: true, accessExpiresAt: true },
    }),
    db.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true, includedInMembership: true },
    }),
  ]);

  if (!user || user.status !== "ACTIVE") return denied;

  const isAdmin = user.role === "ADMIN";
  const isOwner = Boolean(
    user.creatorProfile?.id && course && course.creatorId === user.creatorProfile.id,
  );
  // A refunded enrolment is revoked and must not grant access.
  //
  // A subscription enrolment also carries an expiry. It is compared here
  // rather than left to the cron that tidies up lapsed subscriptions,
  // because that runs every ten minutes and access must stop at the moment
  // the paid period ends, not up to ten minutes later. One-time purchases,
  // free courses and admin grants leave accessExpiresAt NULL and are
  // unaffected.
  const enrolled = Boolean(
    enrollment &&
      !enrollment.revokedAt &&
      (!enrollment.accessExpiresAt || enrollment.accessExpiresAt.getTime() > Date.now()),
  );

  // The other way in: a live membership of the creator's community, for a
  // course the creator put inside it.
  //
  // Deliberately derived rather than written as enrolment rows at join time.
  // Rows would mean a creator adding a course next month has to backfill
  // every existing member, excluding one has to revoke them again, and any
  // gap between those two jobs is somebody seeing something they should not.
  // Asking the question at read time cannot drift.
  let membershipExpiresAt: Date | null = null;
  if (!enrolled && !isOwner && !isAdmin && course?.includedInMembership) {
    const membership = await db.subscription.findUnique({
      where: { userId_scopeKey: { userId, scopeKey: communityScope(course.creatorId) } },
      select: { status: true, currentPeriodEnd: true },
    });
    // Same instant-expiry rule as an enrolment: the period end is compared
    // here, not left to the cron that tidies up lapsed subscriptions.
    if (
      membership &&
      membership.status !== "EXPIRED" &&
      membership.currentPeriodEnd.getTime() > Date.now()
    ) {
      membershipExpiresAt = membership.currentPeriodEnd;
    }
  }

  const viaMembership = membershipExpiresAt !== null;
  const hasAccess = enrolled || viaMembership;

  return {
    enrolled: hasAccess,
    isOwner,
    isAdmin,
    canView: hasAccess || isOwner || isAdmin,
    accessExpiresAt: enrolled
      ? (enrollment?.accessExpiresAt ?? null)
      : membershipExpiresAt,
    viaMembership,
  };
}

/** Enrolment-only gate — creators/admins get access, but this reports truth. */
export async function isEnrolled(userId: string | null, courseId: string): Promise<boolean> {
  if (!userId) return false;
  const e = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { revokedAt: true },
  });
  return Boolean(e && !e.revokedAt);
}
