import { db } from "@/lib/db";

/**
 * Asking to be let into a circle.
 *
 * Deliberately separate from the subscription. Approval answers "may this
 * person be here"; the subscription answers "have they paid". Folding them
 * together would mean either charging somebody before finding out they are
 * refused, or letting an approval quietly stand in for a payment.
 *
 * So the order for a gated circle is: apply → the owner approves → pay. The
 * money is the last step, never the first.
 */

export type JoinRequestStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface JoinGate {
  /** Does this circle review applicants at all? */
  required: boolean;
  status: JoinRequestStatus;
  /** True when nothing stands between this person and checkout. */
  cleared: boolean;
  reviewNote: string | null;
}

export async function getJoinGate(
  creatorId: string,
  userId: string | null,
  requiresApproval: boolean,
): Promise<JoinGate> {
  // A removed person is refused whether or not the circle reviews applicants.
  if (await isRemoved(creatorId, userId)) {
    return { required: true, status: "REJECTED", cleared: false, reviewNote: null };
  }
  if (!requiresApproval) {
    return { required: false, status: "APPROVED", cleared: true, reviewNote: null };
  }
  if (!userId) {
    return { required: true, status: "NONE", cleared: false, reviewNote: null };
  }

  const request = await db.communityJoinRequest.findUnique({
    where: { creatorId_userId: { creatorId, userId } },
    select: { status: true, reviewNote: true },
  });

  const status = (request?.status as JoinRequestStatus) ?? "NONE";
  return {
    required: true,
    status,
    cleared: status === "APPROVED",
    reviewNote: request?.reviewNote ?? null,
  };
}

/**
 * The gate as a single boolean, for the checkout.
 *
 * Re-read here rather than trusted from the client: the join panel decides
 * which button to draw, and this decides whether the charge may happen.
 */
export async function isRemoved(creatorId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  return Boolean(
    await db.communityBan.findUnique({
      where: { creatorId_userId: { creatorId, userId } },
      select: { id: true },
    }),
  );
}

export async function canCheckout(creatorId: string, userId: string): Promise<boolean> {
  // Somebody the circle removed cannot pay their way back in.
  if (await isRemoved(creatorId, userId)) return false;
  const creator = await db.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { communityRequiresApproval: true },
  });
  if (!creator?.communityRequiresApproval) return true;

  const request = await db.communityJoinRequest.findUnique({
    where: { creatorId_userId: { creatorId, userId } },
    select: { status: true },
  });
  return request?.status === "APPROVED";
}
