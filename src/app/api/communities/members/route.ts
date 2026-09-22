import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getMembership } from "@/lib/community";
import { communityLabel, communityScope } from "@/lib/membership";
import { notify } from "@/lib/notifications";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

const removeSchema = z
  .object({
    creatorId: cuid,
    userId: cuid,
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * Removing somebody from a circle, and letting them back.
 *
 * Removal ends three things at once, because leaving any of them would let the
 * person straight back in: the standing ban, their appointed role, and the
 * subscription that was paying for the room. Courses they bought outright are
 * untouched — that is a sale, not a seat.
 *
 * Who may remove whom: the owner and a platform admin may remove anyone but
 * the owner; an appointed admin may remove plain members only. An admin who
 * could remove another admin could quietly take the circle from its owner.
 */
async function loadCircle(userId: string, creatorId: string) {
  const creator = await db.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { id: true, userId: true, slug: true, displayName: true, communityName: true },
  });
  if (!creator) throw notFoundError("წრე ვერ მოიძებნა");

  const membership = await getMembership(userId, creator.id);
  // Moderators moderate; throwing somebody out of the room is the owner's
  // power and their admins', never a helper's.
  if (!(membership.isOwner || membership.isAdmin || membership.isCircleAdmin)) {
    throw new ApiError(403, "FORBIDDEN", "წევრის გაგდება მხოლოდ მფლობელსა და ადმინებს შეუძლიათ");
  }
  return { creator, membership };
}

/** Keep the card's member count honest after a removal or a restore. */
async function recount(creatorId: string) {
  const live = await db.subscription.count({
    where: {
      creatorId,
      kind: "COMMUNITY",
      status: { in: ["ACTIVE", "CANCELLED"] },
      currentPeriodEnd: { gt: new Date() },
      user: { communityBans: { none: { creatorId } } },
    },
  });
  await db.creatorProfile.update({
    where: { id: creatorId },
    data: { communityMemberCount: live },
  });
}

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, removeSchema);
  const { creator, membership } = await loadCircle(user.id, body.creatorId);

  if (body.userId === creator.userId) {
    throw new ApiError(409, "CONFLICT", "მფლობელის გაგდება შეუძლებელია");
  }
  if (body.userId === user.id) {
    throw new ApiError(409, "CONFLICT", "საკუთარი თავის გაგდება შეუძლებელია");
  }

  const target = await getMembership(body.userId, creator.id);
  if (target.isCircleAdmin && !(membership.isOwner || membership.isAdmin)) {
    throw new ApiError(403, "FORBIDDEN", "ადმინის გაგდება მხოლოდ მფლობელს შეუძლია");
  }

  await db.communityBan.upsert({
    where: { creatorId_userId: { creatorId: creator.id, userId: body.userId } },
    create: {
      creatorId: creator.id,
      userId: body.userId,
      removedById: user.id,
      reason: body.reason ?? null,
    },
    update: { removedById: user.id, reason: body.reason ?? null },
  });

  await db.communityRole.deleteMany({
    where: { creatorId: creator.id, userId: body.userId },
  });

  // The seat is gone, so the billing for it stops here rather than renewing
  // against a room they can no longer open.
  await db.subscription.updateMany({
    where: { userId: body.userId, scopeKey: communityScope(creator.id) },
    data: { status: "EXPIRED", currentPeriodEnd: new Date() },
  });

  await recount(creator.id);

  await notify({
    userId: body.userId,
    type: "COMMUNITY_ROLE",
    title: "წრიდან გაგდებული ხარ",
    body: body.reason
      ? `${communityLabel(creator, "ka")}: ${body.reason}`
      : communityLabel(creator, "ka"),
    linkUrl: `/community/${creator.slug}`,
  });

  return jsonOk({ ok: true, removed: true });
});

/** Let a removed person back. They still have to join — and pay — again. */
export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const params = new URL(request.url).searchParams;
  const creatorId = params.get("creatorId") ?? "";
  const userId = params.get("userId") ?? "";
  const { creator } = await loadCircle(user.id, creatorId);

  await db.communityBan.deleteMany({ where: { creatorId: creator.id, userId } });
  await recount(creator.id);

  await notify({
    userId,
    type: "COMMUNITY_ROLE",
    title: "წრეში დაბრუნება შეგიძლია",
    body: communityLabel(creator, "ka"),
    linkUrl: `/community/${creator.slug}`,
  });

  return jsonOk({ ok: true, removed: false });
});
