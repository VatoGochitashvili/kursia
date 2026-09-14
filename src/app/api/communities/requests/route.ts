import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";
import { communityLabel } from "@/lib/membership";
import { cuid } from "@/lib/validation";
import { getMembership } from "@/lib/community";

export const runtime = "nodejs";

const applySchema = z
  .object({ creatorId: cuid, message: z.string().trim().max(500).optional() })
  .strict();

/**
 * Applying to join a circle, and — for its owner — reading who has applied.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, applySchema);

  const creator = await db.creatorProfile.findUnique({
    where: { id: body.creatorId },
    select: {
      id: true, userId: true, slug: true, displayName: true,
      communityName: true, communityEnabled: true, communityRequiresApproval: true,
    },
  });
  if (!creator) throw notFoundError("წრე ვერ მოიძებნა");
  if (!creator.communityEnabled) throw new ApiError(409, "CONFLICT", "ეს წრე ჯერ არ არის გახსნილი");
  if (creator.userId === user.id) throw new ApiError(409, "CONFLICT", "ეს შენი სივრცეა");
  if (!creator.communityRequiresApproval) {
    throw new ApiError(409, "CONFLICT", "ამ წრეში დადასტურება საჭირო არ არის");
  }

  const existing = await db.communityJoinRequest.findUnique({
    where: { creatorId_userId: { creatorId: creator.id, userId: user.id } },
    select: { id: true, status: true },
  });
  // Already approved — nothing to apply for. Already pending — saying so beats
  // silently writing the same row again.
  if (existing?.status === "APPROVED") {
    return jsonOk({ request: { status: "APPROVED" } });
  }

  const saved = await db.communityJoinRequest.upsert({
    where: { creatorId_userId: { creatorId: creator.id, userId: user.id } },
    create: { creatorId: creator.id, userId: user.id, message: body.message || null },
    // Re-applying after a refusal reopens the same row and clears the old
    // note, so an owner is never shown a stale reason next to a fresh ask.
    update: {
      status: "PENDING",
      message: body.message || null,
      reviewNote: null,
      reviewedAt: null,
      createdAt: new Date(),
    },
    select: { id: true, status: true },
  });

  // Everyone who can act on it hears about it — the owner and each admin —
  // so a request does not sit waiting for one person who is away.
  const reviewers = await db.communityRole.findMany({
    where: { creatorId: creator.id },
    select: { userId: true },
  });
  for (const reviewerId of new Set([creator.userId, ...reviewers.map((r) => r.userId)])) {
    await notify({
      userId: reviewerId,
      type: "COMMUNITY_JOIN_REQUEST",
      title: "ახალი განაცხადი წრეში",
      body: body.message?.slice(0, 200) || communityLabel(creator),
      linkUrl: `/community/${creator.slug}/members`,
    }).catch(() => undefined);
  }

  return jsonOk({ request: saved });
});

/** The owner's queue. */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const creatorId = new URL(request.url).searchParams.get("creatorId") ?? "";

  const creator = await db.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { id: true, userId: true },
  });
  if (!creator) throw notFoundError("წრე ვერ მოიძებნა");
  // The owner, a platform admin, or an admin the owner appointed.
  if (!(await getMembership(user.id, creator.id)).canModerate) {
    throw new ApiError(403, "FORBIDDEN", "წვდომა შეზღუდულია");
  }

  const requests = await db.communityJoinRequest.findMany({
    where: { creatorId: creator.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true, message: true, createdAt: true,
      user: {
        select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } },
      },
    },
  });

  return jsonOk({ requests });
});
