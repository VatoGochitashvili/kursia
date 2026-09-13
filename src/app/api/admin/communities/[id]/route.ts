import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/rbac";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { communityLabel } from "@/lib/membership";
import { revalidateCatalogue } from "@/lib/courses";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    status: z.enum(["APPROVED", "PENDING", "REJECTED", "SUSPENDED"]),
    /** Shown to the creator. Required when refusing, so nobody is left guessing. */
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * Approve, refuse or suspend one circle.
 *
 * This decides only whether the circle is LISTED and open. It never touches
 * the creator's courses, their sales, their balance or anybody's existing
 * membership — suspending a space must not confiscate money that members have
 * already paid, and the period they bought runs to its end either way.
 */
export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  const creator = await db.creatorProfile.findUnique({
    where: { id },
    select: {
      id: true, userId: true, slug: true, displayName: true,
      communityName: true, communityStatus: true,
    },
  });
  if (!creator) throw notFoundError("წრე ვერ მოიძებნა");

  const body = await readJson(request, bodySchema);
  const label = communityLabel(creator);

  const updated = await db.creatorProfile.update({
    where: { id },
    data: {
      communityStatus: body.status,
      communityReviewedAt: new Date(),
      communityReviewNote: body.note || null,
    },
    select: { id: true, communityStatus: true, communityReviewNote: true },
  });

  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.COMMUNITY_STATUS_CHANGED,
    targetType: "CreatorProfile",
    targetId: creator.id,
    summary: `${label}: ${creator.communityStatus} → ${body.status}`,
    metadata: { note: body.note ?? null },
  });

  // Tell the creator either way. A refusal with no explanation and no notice
  // is how a platform loses the people it is trying to attract.
  const MESSAGES: Record<string, { title: string; body: string }> = {
    APPROVED: { title: "წრე დამტკიცდა", body: `„${label}" უკვე ჩანს კატალოგში.` },
    REJECTED: { title: "წრე არ დამტკიცდა", body: body.note || "დეტალებისთვის დაგვიკავშირდი." },
    SUSPENDED: { title: "წრე შეჩერდა", body: body.note || "დეტალებისთვის დაგვიკავშირდი." },
    PENDING: { title: "წრე განხილვაშია", body: `„${label}" შემოწმების პროცესშია.` },
  };
  const message = MESSAGES[body.status];
  if (message) {
    await notify({
      userId: creator.userId,
      type: "COMMUNITY_REVIEWED",
      title: message.title,
      body: message.body,
      linkUrl: "/dashboard/creator/community",
    }).catch(() => undefined);
  }

  // The directory is cached; a decision has to show up without waiting it out.
  revalidateCatalogue();

  return jsonOk({ community: updated });
});
