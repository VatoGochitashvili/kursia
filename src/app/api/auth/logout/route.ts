import { assertSameOrigin, handler, jsonOk } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";

export const POST = handler(async () => {
  await assertSameOrigin();
  await destroySession();
  return jsonOk({ ok: true });
});
