import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/rbac";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { percentToBps } from "@/lib/money";
import { invalidateSettingsCache } from "@/lib/settings";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    isVerified: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    featuredRank: z.number().int().min(0).max(999).nullable().optional(),
    /** Per-creator commission override, as a percentage. null = use platform default. */
    commissionPercent: z.number().min(0).max(100).nullable().optional(),
  })
  .strict();

/** Verify, feature, or set a bespoke commission for one creator. */
export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  const creator = await db.creatorProfile.findUnique({
    where: { id },
    select: {
      id: true, displayName: true, isVerified: true,
      commissionBpsOverride: true, userId: true,
    },
  });
  if (!creator) throw notFoundError("ინსტრუქტორი ვერ მოიძებნა");

  const body = await readJson(request, bodySchema);

  const updated = await db.creatorProfile.update({
    where: { id },
    data: {
      isVerified: body.isVerified,
      isFeatured: body.isFeatured,
      featuredRank: body.featuredRank,
      ...(body.commissionPercent !== undefined
        ? {
            commissionBpsOverride:
              body.commissionPercent === null ? null : percentToBps(body.commissionPercent),
          }
        : {}),
      ...(body.isVerified === true && !creator.isVerified ? { approvedAt: new Date() } : {}),
    },
    select: {
      id: true, isVerified: true, isFeatured: true,
      featuredRank: true, commissionBpsOverride: true,
    },
  });

  // Commission is cached per request cycle; drop the cache so the next sale
  // uses the new rate.
  invalidateSettingsCache();

  if (body.isVerified !== undefined && body.isVerified !== creator.isVerified) {
    await audit({
      actorId: admin.id,
      action: body.isVerified ? AUDIT_ACTIONS.CREATOR_VERIFIED : AUDIT_ACTIONS.CREATOR_UNVERIFIED,
      targetType: "CreatorProfile",
      targetId: id,
      summary: creator.displayName,
    });
    if (body.isVerified) {
      await notify({
        userId: creator.userId,
        type: "CREATOR_VERIFIED",
        title: "თქვენი პროფილი ვერიფიცირებულია",
        body: "ახლა თქვენს პროფილზე ვერიფიკაციის ნიშანი გამოჩნდება.",
        linkUrl: "/dashboard/creator",
      });
    }
  }

  if (body.commissionPercent !== undefined) {
    await audit({
      actorId: admin.id,
      action: AUDIT_ACTIONS.CREATOR_COMMISSION_SET,
      targetType: "CreatorProfile",
      targetId: id,
      summary: `${creator.displayName}: ${body.commissionPercent ?? "platform default"}%`,
      metadata: { previous: creator.commissionBpsOverride },
    });
  }

  return jsonOk(updated);
});
