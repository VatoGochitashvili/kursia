import { handler, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/rbac";
import { beginMutation } from "@/lib/api";
import { sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Send a test message to the signed-in administrator's own address.
 *
 * Only ever to their own address: an endpoint that emails anywhere is an open
 * relay wearing an admin badge.
 */
export const POST = handler(async () => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const result = await sendTestEmail(admin.email, admin.locale === "en" ? "en" : "ka");
  return jsonOk({ ...result, to: admin.email });
});
