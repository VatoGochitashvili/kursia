import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Login is rate-limited per client and always does the same amount of work
 * whether or not the address exists, so response timing does not reveal which
 * emails are registered. The error message is identical in both cases.
 */
export const POST = handler(async (request) => {
  await beginMutation("login");
  const { email, password } = await readJson(request, loginSchema);

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, status: true },
  });

  // A dummy hash keeps the scrypt cost identical for unknown addresses.
  const storedHash =
    user?.passwordHash ??
    "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

  const valid = await verifyPassword(password, storedHash);

  if (!user || !valid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "ელფოსტა ან პაროლი არასწორია");
  }
  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "ანგარიში დაბლოკილია. დაგვიკავშირდით.");
  }
  if (user.status !== "ACTIVE") {
    throw new ApiError(401, "INVALID_CREDENTIALS", "ელფოსტა ან პაროლი არასწორია");
  }

  // Transparently upgrade hashes written with weaker parameters.
  if (needsRehash(user.passwordHash)) {
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  return jsonOk({
    ok: true,
    redirectTo:
      user.role === "ADMIN" ? "/admin" : user.role === "CREATOR" ? "/dashboard/creator" : "/dashboard",
  });
});
