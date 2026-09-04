import { ApiError, handler, jsonOk, readQuery } from "@/lib/api";
import { verifyEmailSchema } from "@/lib/validation";
import { verifyEmailToken } from "@/lib/auth/accounts";

export const runtime = "nodejs";

/** GET so the link in an email works directly. */
export const GET = handler(async (request) => {
  const { token } = readQuery(request, verifyEmailSchema);
  const ok = await verifyEmailToken(token);
  if (!ok) throw new ApiError(400, "INVALID_TOKEN", "ბმული არასწორია ან ვადაგასულია");
  return jsonOk({ ok: true });
});
