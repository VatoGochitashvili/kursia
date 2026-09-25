import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { consumeCircleLeaveCode } from "@/lib/auth/accounts";
import { startCommunityCheckout } from "@/lib/payments/fulfillment";
import { cancelSubscription } from "@/lib/subscriptions";
import { communityScope } from "@/lib/membership";
import { getLocale } from "@/i18n";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

const joinSchema = z
  .object({ creatorId: cuid, provider: z.string().trim().max(32).optional() })
  .strict();

/**
 * Joining a community, and leaving one.
 *
 * POST starts a checkout and returns a redirect URL — nothing else. No
 * membership is granted here; that happens when the money settles, in the
 * same fulfilment path a course sale uses. A free community still goes
 * through it rather than short-circuiting, so there is one way in.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("checkout", user.id);

  const { creatorId, provider } = await readJson(request, joinSchema);
  const result = await startCommunityCheckout({
    userId: user.id,
    creatorId,
    providerId: provider,
    locale: await getLocale(),
  });

  return jsonOk(result);
});

/**
 * Stop renewing.
 *
 * The paid period is honoured to its end — cancelling on day 2 of a month
 * already paid for keeps the other 28 days. Taking the space away at the
 * moment someone cancels would be taking back something already sold, and it
 * is also the surest way to make them not come back.
 */
export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("passwordReset", user.id);

  const params = new URL(request.url).searchParams;
  const creatorId = params.get("creatorId") ?? "";
  const code = params.get("code") ?? "";
  if (!cuid.safeParse(creatorId).success || !/^\d{6}$/.test(code)) {
    throw new ApiError(400, "VALIDATION_ERROR", "არასწორი მოთხოვნა");
  }

  const subscription = await db.subscription.findUnique({
    where: { userId_scopeKey: { userId: user.id, scopeKey: communityScope(creatorId) } },
    select: { id: true },
  });
  if (!subscription) throw notFoundError("წევრობა ვერ მოიძებნა");

  // Leaving ends something the person pays for, so it takes the code that
  // was emailed to them — not just a signed-in session. Checked after the
  // membership is found, so a mistyped circle does not burn the code.
  if (!(await consumeCircleLeaveCode(user.id, code))) {
    throw new ApiError(400, "INVALID_TOKEN", "კოდი არასწორია ან ვადაგასულია");
  }

  const cancelled = await cancelSubscription(user.id, subscription.id);
  if (!cancelled) throw new ApiError(409, "CONFLICT", "გაუქმება ვერ მოხერხდა");

  return jsonOk({
    cancelled: true,
    accessUntil: cancelled.currentPeriodEnd,
  });
});
