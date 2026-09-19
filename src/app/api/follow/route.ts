import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { forbidden, requireUser } from "@/lib/auth/rbac";
import { sharedCircleIds } from "@/lib/social";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Following a creator.
 *
 * The Follow row points at the creator's USER id, not their CreatorProfile,
 * because that is what a notification is addressed to — and a creator who is
 * also a student is one person either way.
 *
 * Callers pass either the creator profile id, which is what a public page
 * has, or — for members — a user id. A member can be followed only by someone
 * who shares a circle with them: a circle is where people meet here, and it
 * keeps a stranger from collecting followers across the whole platform.
 */
const bodySchema = z
  .object({ creatorId: cuid.optional(), userId: cuid.optional() })
  .strict()
  .refine((b) => Boolean(b.creatorId) !== Boolean(b.userId), "creatorId ან userId");

async function resolveTarget(
  followerId: string,
  target: { creatorId?: string | null; userId?: string | null },
): Promise<string> {
  if (target.creatorId) return resolveCreatorUserId(target.creatorId);
  const userId = target.userId ?? "";
  const exists = await db.user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!exists) throw notFoundError("მომხმარებელი ვერ მოიძებნა");
  if (userId !== followerId && (await sharedCircleIds(followerId, userId)).length === 0) {
    throw forbidden("გამოწერა შეგიძლია მხოლოდ შენი წრის წევრების");
  }
  return userId;
}

async function resolveCreatorUserId(creatorId: string): Promise<string> {
  const creator = await db.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { userId: true },
  });
  if (!creator) throw notFoundError("ავტორი ვერ მოიძებნა");
  return creator.userId;
}

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const target = await readJson(request, bodySchema);

  const followedUserId = await resolveTarget(user.id, target);
  if (followedUserId === user.id) throw conflict("საკუთარ თავზე გამოწერა შეუძლებელია");

  await db.follow
    .create({ data: { followerId: user.id, followedUserId } })
    // Following twice is a no-op, not an error.
    .catch(() => undefined);

  const followers = await db.follow.count({ where: { followedUserId } });
  return jsonOk({ ok: true, following: true, followers });
});

export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);

  const params = new URL(request.url).searchParams;
  const creatorId = params.get("creatorId");
  // Unfollowing needs no shared circle: anyone may stop following anyone.
  const followedUserId = creatorId
    ? await resolveCreatorUserId(creatorId)
    : (params.get("userId") ?? "");

  await db.follow.deleteMany({ where: { followerId: user.id, followedUserId } });

  const followers = await db.follow.count({ where: { followedUserId } });
  return jsonOk({ ok: true, following: false, followers });
});
