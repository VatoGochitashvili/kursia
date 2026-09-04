import { z } from "zod";
import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { markRead, unreadCount } from "@/lib/notifications";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

const bodySchema = z.object({ ids: z.array(cuid).max(200).optional() }).strict();

/** Mark notifications read. Always scoped to the caller's own rows. */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { ids } = await readJson(request, bodySchema);

  await markRead(user.id, ids);
  return jsonOk({ ok: true, unread: await unreadCount(user.id) });
});
