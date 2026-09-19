import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { startCreatorPlanCheckout } from "@/lib/payments/fulfillment";
import { cancelSubscription } from "@/lib/subscriptions";
import { getPlanState } from "@/lib/creator-plan";
import { getSettings } from "@/lib/settings";
import { getLocale } from "@/i18n";

export const runtime = "nodejs";

/**
 * The creator's own plan.
 *
 * The creator profile is resolved from the session, never from the request —
 * there is no id here to tamper with, so nobody can start or cancel somebody
 * else's plan.
 */
const startSchema = z
  .object({ interval: z.enum(["MONTHLY", "YEARLY"]).optional() })
  .strict();

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("checkout", user.id);

  // An empty body is a plain monthly start, so the existing plan page keeps
  // working without sending anything new.
  const body = await readJson(request, startSchema).catch(() => ({ interval: undefined }));

  const result = await startCreatorPlanCheckout({
    userId: user.id,
    interval: body.interval,
    locale: await getLocale(),
  });

  return jsonOk(result);
});

/** Stop renewing. The paid period runs to its end, as everywhere else. */
export const DELETE = handler(async () => {
  const user = await requireUser();
  await beginMutation("write", user.id);

  const [creator, settings] = await Promise.all([
    db.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    getSettings(),
  ]);
  if (!creator) throw new ApiError(403, "FORBIDDEN", "ავტორის პროფილი არ გაქვთ");

  const plan = await getPlanState(creator.id, settings.creatorPlanPriceMinor);
  if (!plan.subscriptionId) throw notFoundError("გეგმა ვერ მოიძებნა");

  const cancelled = await cancelSubscription(user.id, plan.subscriptionId);
  if (!cancelled) throw new ApiError(409, "CONFLICT", "გაუქმება ვერ მოხერხდა");

  return jsonOk({ cancelled: true, accessUntil: cancelled.currentPeriodEnd });
});
