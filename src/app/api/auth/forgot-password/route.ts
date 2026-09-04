import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { startPasswordReset } from "@/lib/auth/accounts";
import { getLocale } from "@/i18n";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  await beginMutation("passwordReset");
  const { email } = await readJson(request, forgotPasswordSchema);
  await startPasswordReset(email, await getLocale());

  // Always the same response — never confirms whether the address exists.
  return jsonOk({ ok: true });
});
