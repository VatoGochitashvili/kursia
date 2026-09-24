import { z } from "zod";
import { ApiError, beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { confirmDeactivation, requestDeactivation } from "@/lib/auth/accounts";
import { getLocale } from "@/i18n";

export const runtime = "nodejs";

/** Ask for the code that closes the account. */
export const POST = handler(async () => {
  const user = await requireUser();
  await beginMutation("passwordReset", user.id);
  await requestDeactivation(user.id, await getLocale());
  return jsonOk({ sent: true });
});

const confirmSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict();

/** Confirm with the code. Every session ends here. */
export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("passwordReset", user.id);
  const { code } = await readJson(request, confirmSchema);

  if (!(await confirmDeactivation(user.id, code))) {
    throw new ApiError(400, "INVALID_TOKEN", "კოდი არასწორია ან ვადაგასულია");
  }
  return jsonOk({ deactivated: true });
});
