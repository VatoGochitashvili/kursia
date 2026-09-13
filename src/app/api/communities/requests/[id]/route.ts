import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";
import { communityLabel } from "@/lib/membership";

export const runtime = "nodejs";

const decideSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * The owner's decision on one application.
 *
 * Approving grants nothing by itself — it only removes the barrier to
 * checkout. A free circle still needs the person to join; a paid one still
 * needs them to pay. That is what keeps "may they be here" and "have they
 * paid" from quietly becoming the same question.
 */
export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { id } = await context.params;

  const joinRequest = await db.communityJoinRequest.findUnique({
    where: { id },
    select: {
      id: true, userId: true, status: true,
      creator: {
        select: { id: true, userId: true, slug: true, displayName: true, communityName: true },
      },
    },
  });
  if (!joinRequest) throw notFoundError("განაცხადი ვერ მოიძებნა");

  if (joinRequest.creator.userId !== user.id && user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "წვდომა შეზღუდულია");
  }

  const body = await readJson(request, decideSchema);

  const updated = await db.communityJoinRequest.update({
    where: { id },
    data: {
      status: body.status,
      reviewNote: body.note || null,
      reviewedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  const label = communityLabel(joinRequest.creator);
  await notify({
    userId: joinRequest.userId,
    type: "COMMUNITY_JOIN_REQUEST",
    title: body.status === "APPROVED" ? "განაცხადი დამტკიცდა" : "განაცხადი არ დამტკიცდა",
    body:
      body.status === "APPROVED"
        ? `„${label}" — ახლა შეგიძლია შემოერთდე.`
        : body.note || `„${label}"`,
    linkUrl: `/community/${joinRequest.creator.slug}`,
  }).catch(() => undefined);

  return jsonOk({ request: updated });
});
