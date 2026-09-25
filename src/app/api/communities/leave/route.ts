import { beginMutation, handler, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { requestCircleLeave } from "@/lib/auth/accounts";
import { getLocale } from "@/i18n";

export const runtime = "nodejs";

/** Email the code that confirms leaving a circle. */
export const POST = handler(async () => {
  const user = await requireUser();
  await beginMutation("passwordReset", user.id);
  await requestCircleLeave(user.id, await getLocale());
  return jsonOk({ sent: true });
});
