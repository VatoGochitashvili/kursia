import { handler, jsonOk } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Session probe — used by clients (including a future mobile app). */
export const GET = handler(async () => {
  const user = await getSessionUser();
  return jsonOk({ user });
});
