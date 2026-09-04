import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "./session";
import type { UserRole } from "@/lib/enums";

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
): Promise<{ enrolled: boolean; isOwner: boolean; isAdmin: boolean; canView: boolean }> {
  if (!userId) return { enrolled: false, isOwner: false, isAdmin: false, canView: false };

  const [user, enrollment, course] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, creatorProfile: { select: { id: true } } },
    }),
    db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, revokedAt: true },
    }),
    db.course.findUnique({ where: { id: courseId }, select: { creatorId: true } }),
  ]);

  if (!user || user.status !== "ACTIVE") {
    return { enrolled: false, isOwner: false, isAdmin: false, canView: false };
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner = Boolean(
    user.creatorProfile?.id && course && course.creatorId === user.creatorProfile.id,
  );
  // A refunded enrolment is revoked and must not grant access.
  const enrolled = Boolean(enrollment && !enrollment.revokedAt);

  return { enrolled, isOwner, isAdmin, canView: enrolled || isOwner || isAdmin };
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
