import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { requireUser } from "@/lib/auth/rbac";
import { createSession, revokeAllSessions } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  const sessionUser = await requireUser();
  await beginMutation("passwordReset", sessionUser.id);
  const { currentPassword, newPassword } = await readJson(request, changePasswordSchema);

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "INVALID_PASSWORD", "მიმდინარე პაროლი არასწორია");
  }

  await db.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Sign out every device, then re-issue a session for the current one so the
  // user is not logged out of the tab they just used.
  await revokeAllSessions(sessionUser.id);
  await createSession(sessionUser.id);

  await notify({
    userId: sessionUser.id,
    type: "SECURITY_PASSWORD_CHANGED",
    title: "პაროლი შეიცვალა",
    body: "სხვა მოწყობილობებზე სესია დასრულდა.",
    email: { template: "passwordChanged", payload: {} },
  });

  return jsonOk({ ok: true });
});
