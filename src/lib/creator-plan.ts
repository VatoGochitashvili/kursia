import { db } from "@/lib/db";
import { planScope } from "@/lib/membership";

/**
 * The creator's plan: what they pay the platform, monthly, to keep a circle
 * open.
 *
 * The same subscription machinery as a membership, pointed the other way —
 * a creator subscribing to the platform rather than a member subscribing to a
 * creator. Reusing it means renewals, cancellation, the "ending soon" notice
 * and the expiry sweep all already work; only the money split differs, and
 * that is handled at settlement.
 *
 * What the plan gates is deliberately narrow: a LIVE CIRCLE. It does not touch
 * courses, existing sales, payouts, or anything a creator has already earned.
 * Locking someone out of revenue they have already made because a payment
 * lapsed would be indefensible, and it is not what Skool does either.
 */

export type PlanStatus = "NONE" | "ACTIVE" | "CANCELLED" | "EXPIRED";

export interface PlanState {
  /** Zero means the platform is free to create on. */
  priceMinor: number;
  /** True when no payment is required at all. */
  isFree: boolean;
  active: boolean;
  status: PlanStatus;
  currentPeriodEnd: Date | null;
  subscriptionId: string | null;
}

const FREE_PLAN: PlanState = {
  priceMinor: 0,
  isFree: true,
  active: true,
  status: "ACTIVE",
  currentPeriodEnd: null,
  subscriptionId: null,
};

/**
 * Looked up by scope rather than by the (userId, scopeKey) unique key: the
 * callers that need this — the directory, the settings gate, the admin list —
 * hold a creator profile, not the user behind it. One creator has exactly one
 * plan row, so `findFirst` on the scope is precise.
 */
export async function getPlanState(
  creatorId: string,
  priceMinor: number,
): Promise<PlanState> {
  if (priceMinor <= 0) return FREE_PLAN;

  const row = await db.subscription.findFirst({
    where: { scopeKey: planScope(creatorId) },
    select: { id: true, status: true, currentPeriodEnd: true },
  });

  if (!row) {
    return {
      priceMinor,
      isFree: false,
      active: false,
      status: "NONE",
      currentPeriodEnd: null,
      subscriptionId: null,
    };
  }

  // A cancelled plan still runs to the end of the period already paid for,
  // exactly as a member's cancelled membership does.
  const active = row.status !== "EXPIRED" && row.currentPeriodEnd.getTime() > Date.now();

  return {
    priceMinor,
    isFree: false,
    active,
    status: active ? (row.status === "CANCELLED" ? "CANCELLED" : "ACTIVE") : "EXPIRED",
    currentPeriodEnd: row.currentPeriodEnd,
    subscriptionId: row.id,
  };
}

/** Quick gate for routes that only need a yes or no. */
export async function hasActivePlan(creatorId: string, priceMinor: number): Promise<boolean> {
  return (await getPlanState(creatorId, priceMinor)).active;
}

/**
 * The Prisma filter for "this creator is paying".
 *
 * Returned as a filter rather than a list of ids so the directory can ask the
 * database one question instead of loading every creator and checking each in
 * turn. On a free platform it is an empty object — no condition at all.
 */
export function payingCreatorFilter(priceMinor: number) {
  if (priceMinor <= 0) return {};
  return {
    subscriptions: {
      some: {
        kind: "CREATOR_PLAN",
        status: { in: ["ACTIVE", "CANCELLED"] },
        currentPeriodEnd: { gt: new Date() },
      },
    },
  };
}
