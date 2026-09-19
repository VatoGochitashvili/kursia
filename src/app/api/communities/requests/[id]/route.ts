import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";
import { communityLabel } from "@/lib/membership";
import { getMembership } from "@/lib/community";
import { startCommunityCheckout } from "@/lib/payments/fulfillment";

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
 * For a paid circle, approving only removes the barrier to checkout: "may
 * they be here" and "have they paid" stay separate questions, so nobody is
 * charged before being let in.
 *
 * For a FREE circle there is no second question, so approving admits them on
 * the spot. Otherwise an owner approves somebody, looks at the member list,
 * and finds it unchanged — which is what "approved" ought to have meant.
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
        select: {
          id: true, userId: true, slug: true, displayName: true,
          communityName: true, communityPriceMinor: true,
        },
      },
    },
  });
  if (!joinRequest) throw notFoundError("განაცხადი ვერ მოიძებნა");

  // The owner, a platform admin, or an admin the owner appointed.
  if (!(await getMembership(user.id, joinRequest.creator.id)).canModerate) {
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

  // A free circle admits them here and now. Routed through the ordinary
  // checkout so the subscription, the member count and the notifications all
  // come from the one code path that already gets them right.
  let admitted = false;
  if (body.status === "APPROVED" && joinRequest.creator.communityPriceMinor === 0) {
    try {
      await startCommunityCheckout({
        userId: joinRequest.userId,
        creatorId: joinRequest.creator.id,
        locale: "ka",
      });
      admitted = true;
    } catch (error) {
      // Already a member, or a circle that has since closed. The approval
      // still stands; they can join from the page.
      console.error("[join-request] auto-admit failed", error);
    }
  }

  const label = communityLabel(joinRequest.creator);
  await notify({
    userId: joinRequest.userId,
    type: "COMMUNITY_JOIN_REQUEST",
    title: body.status === "APPROVED" ? "განაცხადი დამტკიცდა" : "განაცხადი არ დამტკიცდა",
    body:
      body.status === "APPROVED"
        ? admitted
          ? `„${label}" — უკვე წევრი ხარ.`
          : `„${label}" — ახლა შეგიძლია შემოერთდე.`
        : body.note || `„${label}"`,
    linkUrl: `/community/${joinRequest.creator.slug}`,
  }).catch(() => undefined);

  return jsonOk({ request: updated, admitted });
});
