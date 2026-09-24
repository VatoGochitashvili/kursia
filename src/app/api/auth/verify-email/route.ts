import { z } from "zod";
import { ApiError, beginMutation, handler, jsonOk, readJson, readQuery } from "@/lib/api";
import { verifyEmailSchema } from "@/lib/validation";
import { verifyEmailCode, verifyEmailToken } from "@/lib/auth/accounts";

export const runtime = "nodejs";

/** GET so a link in an email still works directly. */
export const GET = handler(async (request) => {
  const { token } = readQuery(request, verifyEmailSchema);
  const ok = await verifyEmailToken(token);
  if (!ok) throw new ApiError(400, "INVALID_TOKEN", "კოდი არასწორია ან ვადაგასულია");
  return jsonOk({ ok: true });
});

const codeSchema = z
  .object({
    email: z.string().trim().email().max(200),
    code: z.string().trim().regex(/^\d{6}$/, "ექვსნიშნა კოდი"),
  })
  .strict();

/**
 * Confirm with the six digits from the email.
 *
 * Rate-limited per address: six digits is short enough to guess given
 * unlimited tries, and the limit is what makes it long enough.
 */
export const POST = handler(async (request) => {
  const body = await readJson(request, codeSchema);
  await beginMutation("passwordReset", body.email.toLowerCase());

  const ok = await verifyEmailCode(body.email, body.code);
  if (!ok) throw new ApiError(400, "INVALID_TOKEN", "კოდი არასწორია ან ვადაგასულია");
  return jsonOk({ ok: true });
});
