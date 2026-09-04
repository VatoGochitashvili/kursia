import { beginMutation, handler, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { resendVerification } from "@/lib/auth/accounts";
import { getLocale } from "@/i18n";

export const runtime = "nodejs";

export const POST = handler(async () => {
  const user = await requireUser();
  await beginMutation("passwordReset", user.id);
  await resendVerification(user.id, await getLocale());
  return jsonOk({ ok: true });
});
