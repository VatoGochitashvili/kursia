import { z } from "zod";
import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { savePreferences } from "@/lib/preferences";

export const runtime = "nodejs";

const schema = z
  .object({
    emailMessages: z.boolean().optional(),
    emailCircle: z.boolean().optional(),
    emailEvents: z.boolean().optional(),
    emailPurchases: z.boolean().optional(),
    emailProduct: z.boolean().optional(),
    allowMessages: z.boolean().optional(),
    showMemberships: z.boolean().optional(),
    showOnLeaderboard: z.boolean().optional(),
  })
  .strict();

/** One person's own settings for mail and privacy. */
export const PATCH = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const patch = await readJson(request, schema);
  return jsonOk(await savePreferences(user.id, patch));
});
