import { db } from "@/lib/db";
import {
  ApiError, beginMutation, handler, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { adminUserUpdateSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/rbac";
import { revokeAllSessions } from "@/lib/auth/session";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Change a user's role or status.
 *
 * Two guards that matter:
 *  • An admin cannot suspend or demote themselves — that is how a platform
 *    ends up with nobody able to administer it.
 *  • Suspension revokes every live session immediately; the user does not stay
 *    signed in until their cookie expires.
 */
export const PATCH = handler(async (request, context: Ctx) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  if (id === admin.id) {
    throw new ApiError(400, "SELF_MODIFICATION", "საკუთარი ანგარიშის შეცვლა შეუძლებელია");
  }

  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, role: true, status: true,
      profile: { select: { fullName: true } },
      creatorProfile: { select: { id: true } },
    },
  });
  if (!target) throw notFoundError("მომხმარებელი ვერ მოიძებნა");

  const body = await readJson(request, adminUserUpdateSchema);

  // Promoting to CREATOR must also create the creator profile, or the account
  // would have the role without anywhere to publish from.
  if (body.role === "CREATOR" && !target.creatorProfile) {
    const displayName = target.profile?.fullName ?? target.email.split("@")[0]!;
    const slug = await uniqueSlug(
      displayName,
      async (candidate) => (await db.creatorProfile.count({ where: { slug: candidate } })) > 0,
      { maxLength: 60, fallbackPrefix: "creator" },
    );
    await db.creatorProfile.create({
      data: { userId: id, slug, displayName, balance: { create: {} } },
    });
  }

  const updated = await db.user.update({
    where: { id },
    data: { role: body.role, status: body.status },
    select: { id: true, role: true, status: true },
  });

  if (body.status === "SUSPENDED") {
    await revokeAllSessions(id);
    await notify({
      userId: id,
      type: "ACCOUNT_SUSPENDED",
      title: "ანგარიში დაბლოკილია",
      body: body.reason ?? "",
    });
  }

  if (body.role && body.role !== target.role) {
    await audit({
      actorId: admin.id,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      targetType: "User",
      targetId: id,
      summary: `${target.email}: ${target.role} → ${body.role}`,
      metadata: { reason: body.reason },
    });
  }
  if (body.status && body.status !== target.status) {
    await audit({
      actorId: admin.id,
      action:
        body.status === "SUSPENDED" ? AUDIT_ACTIONS.USER_SUSPENDED : AUDIT_ACTIONS.USER_REINSTATED,
      targetType: "User",
      targetId: id,
      summary: `${target.email}: ${target.status} → ${body.status}`,
      metadata: { reason: body.reason },
    });
  }

  return jsonOk(updated);
});

/**
 * Soft-delete a user.
 *
 * Rows are never hard-deleted: purchases, payouts and audit entries must
 * survive for accounting and dispute resolution. The account is marked DELETED,
 * its sessions revoked and its email released by tombstoning it.
 */
export const DELETE = handler(async (_request, context: Ctx) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  if (id === admin.id) {
    throw new ApiError(400, "SELF_MODIFICATION", "საკუთარი ანგარიშის წაშლა შეუძლებელია");
  }

  const target = await db.user.findUnique({ where: { id }, select: { email: true } });
  if (!target) throw notFoundError();

  await db.user.update({
    where: { id },
    data: {
      status: "DELETED",
      // Frees the address for re-registration without destroying history.
      email: `deleted+${id}@removed.invalid`,
    },
  });
  await revokeAllSessions(id);

  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.USER_DELETED,
    targetType: "User",
    targetId: id,
    summary: target.email,
  });

  return jsonOk({ ok: true });
});
