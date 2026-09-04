import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { checkoutSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/rbac";
import { startCheckout } from "@/lib/payments/fulfillment";
import { getLocale } from "@/i18n";

export const runtime = "nodejs";

/**
 * Starts a checkout. Returns a redirect URL and NOTHING else — no enrolment,
 * no access. The amount charged is read from the database, so a tampered
 * request body cannot change the price.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("checkout", user.id);

  const { courseId, provider } = await readJson(request, checkoutSchema);
  const result = await startCheckout({
    userId: user.id,
    courseId,
    providerId: provider,
    locale: await getLocale(),
  });

  return jsonOk(result);
});
