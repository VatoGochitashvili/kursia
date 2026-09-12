import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Following a creator.
 *
 * The Follow row points at the creator's USER id, not their CreatorProfile,
 * because that is what a notification is addressed to — and a creator who is
 * also a student is one person either way.
 *
 * Callers pass the creator profile id, which is what a public page has, and
 * this resolves it. Accepting a raw user id here would let anyone follow any
 * account on the platform, including students, which is not a relationship
 * this product has.
 */
const bodySchema = z.object({ creatorId: cuid }).strict();

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
  const { creatorId } = await readJson(request, bodySchema);

  const followedUserId = await resolveCreatorUserId(creatorId);
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

  const creatorId = new URL(request.url).searchParams.get("creatorId") ?? "";
  const followedUserId = await resolveCreatorUserId(creatorId);

  await db.follow.deleteMany({ where: { followerId: user.id, followedUserId } });

  const followers = await db.follow.count({ where: { followedUserId } });
  return jsonOk({ ok: true, following: false, followers });
});
