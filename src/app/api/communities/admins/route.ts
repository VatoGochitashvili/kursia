import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getMembership } from "@/lib/community";
import { notify } from "@/lib/notifications";
import { communityLabel } from "@/lib/membership";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

const assignSchema = z.object({ creatorId: cuid, userId: cuid }).strict();

/**
 * Appointing and removing a circle's admins.
 *
 * Only the owner — or a platform admin — may do either. A circle admin cannot
 * appoint more admins: if they could, one compromised or careless account
 * could hand the whole room to strangers.
 */
async function requireCircleOwner(userId: string, creatorId: string) {
  const creator = await db.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { id: true, userId: true, slug: true, displayName: true, communityName: true },
  });
  if (!creator) throw notFoundError("წრე ვერ მოიძებნა");

  const membership = await getMembership(userId, creator.id);
  if (!membership.isOwner && !membership.isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "ადმინების დანიშვნა მხოლოდ მფლობელს შეუძლია");
  }
  return creator;
}

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, assignSchema);
  const creator = await requireCircleOwner(user.id, body.creatorId);

  if (body.userId === creator.userId) {
    throw new ApiError(409, "CONFLICT", "მფლობელს ადმინობა არ სჭირდება");
  }
  // Appointed from inside the room only: an admin who was never a member would
  // be a stranger with moderation powers.
  const target = await getMembership(body.userId, creator.id);
  if (!target.isMember) {
    throw new ApiError(409, "CONFLICT", "ადმინი ჯერ წრის წევრი უნდა იყოს");
  }

  await db.communityRole.upsert({
    where: { creatorId_userId: { creatorId: creator.id, userId: body.userId } },
    create: { creatorId: creator.id, userId: body.userId, role: "ADMIN", assignedById: user.id },
    update: { role: "ADMIN", assignedById: user.id },
  });

  await notify({
    userId: body.userId,
    type: "COMMUNITY_ROLE",
    title: "დაინიშნე ადმინად",
    body: `„${communityLabel(creator)}" — ახლა შეგიძლია დაამტკიცებ ახალ წევრებს.`,
    linkUrl: `/community/${creator.slug}/members`,
  }).catch(() => undefined);

  return jsonOk({ assigned: true });
});

export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);

  // Query params rather than a body: DELETE bodies are legal but some proxies
  // drop them.
  const url = new URL(request.url);
  const creatorId = url.searchParams.get("creatorId") ?? "";
  const userId = url.searchParams.get("userId") ?? "";
  if (!cuid.safeParse(creatorId).success || !cuid.safeParse(userId).success) {
    throw new ApiError(400, "VALIDATION_ERROR", "არასწორი მოთხოვნა");
  }

  await requireCircleOwner(user.id, creatorId);
  const removed = await db.communityRole.deleteMany({ where: { creatorId, userId } });
  return jsonOk({ removed: removed.count > 0 });
});
