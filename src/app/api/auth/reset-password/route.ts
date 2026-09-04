import { ApiError, beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";
import { completePasswordReset } from "@/lib/auth/accounts";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  await beginMutation("passwordReset");
  const { token, password } = await readJson(request, resetPasswordSchema);

  const ok = await completePasswordReset(token, password);
  if (!ok) throw new ApiError(400, "INVALID_TOKEN", "ბმული არასწორია ან ვადაგასულია");

  return jsonOk({ ok: true });
});
