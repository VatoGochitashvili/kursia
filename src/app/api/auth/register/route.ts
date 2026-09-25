import { beginMutation, handler, jsonCreated, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { registerAccount } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  await beginMutation("register");
  const body = await readJson(request, registerSchema);

  const { userId } = await registerAccount({
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    // The client may only ever ask for STUDENT or CREATOR — the schema
    // rejects anything else, so ADMIN cannot be self-assigned.
    accountType: body.accountType,
    displayName: body.displayName,
    locale: body.locale,
  });

  await createSession(userId);
  await audit({
    actorId: userId,
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    targetType: "User",
    targetId: userId,
    summary: `registered as ${body.accountType}`,
  });

  return jsonCreated({
    ok: true,
    // A would-be creator goes to the plans, not to a studio they have not
    // paid for and therefore cannot open.
    // Straight to the code: an unconfirmed address is the one thing worth
    // interrupting a new account for, and the email is already on its way.
    redirectTo: `/verify-email?next=${encodeURIComponent(
      body.accountType === "CREATOR" ? "/start/plans" : "/dashboard/profile",
    )}`,
  });
});
