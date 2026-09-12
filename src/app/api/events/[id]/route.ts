import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getMembership } from "@/lib/community";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Attending an event, and changing one.
 *
 * POST/DELETE are a member saying they will or will not come. PATCH is the
 * creator editing or cancelling. Same row, opposite sides of the permission,
 * so each verb re-derives what the caller is rather than trusting the last
 * check.
 */
async function load(eventId: string, userId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, creatorId: true, title: true, isCancelled: true,
      creator: { select: { slug: true } },
    },
  });
  if (!event) throw notFoundError("შეხვედრა ვერ მოიძებნა");

  const membership = await getMembership(userId, event.creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }
  return { event, membership };
}

/** "I'm coming." */
export const POST = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { event } = await load(id, user.id);

  if (event.isCancelled) throw new ApiError(409, "CONFLICT", "შეხვედრა გაუქმებულია");

  // Saying yes twice is a no-op, not an error.
  await db.eventAttendee
    .create({ data: { eventId: id, userId: user.id } })
    .catch(() => undefined);

  const attendeeCount = await db.eventAttendee.count({ where: { eventId: id } });
  return jsonOk({ attending: true, attendeeCount });
});

/** "Actually, I can't." */
export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);
  await load(id, user.id);

  await db.eventAttendee.deleteMany({ where: { eventId: id, userId: user.id } });
  const attendeeCount = await db.eventAttendee.count({ where: { eventId: id } });
  return jsonOk({ attending: false, attendeeCount });
});

const patchSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    joinUrl: z.union([z.string().trim().url().max(1000), z.literal("")]).nullable().optional(),
    startsAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
    isCancelled: z.boolean().optional(),
  })
  .strict();

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { event, membership } = await load(id, user.id);

  if (!membership.isOwner && !membership.isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "რედაქტირების უფლება არ გაქვთ");
  }

  const body = await readJson(request, patchSchema);
  const startsAt = body.startsAt ? new Date(body.startsAt) : undefined;
  const endsAt = body.endsAt ? new Date(body.endsAt) : undefined;

  const updated = await db.event.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.joinUrl !== undefined ? { joinUrl: body.joinUrl || null } : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(endsAt ? { endsAt } : {}),
      ...(body.isCancelled !== undefined ? { isCancelled: body.isCancelled } : {}),
    },
    select: { id: true, isCancelled: true },
  });

  // Cancelling is the one change worth interrupting people for — they planned
  // around it. A retitle is not.
  if (body.isCancelled === true && !event.isCancelled) {
    const attendees = await db.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
      take: 2000,
    });
    await Promise.all(
      attendees.map((a) =>
        notify({
          userId: a.userId,
          type: "EVENT_CANCELLED",
          title: "შეხვედრა გაუქმდა",
          body: event.title,
          linkUrl: `/community/${event.creator.slug}/events`,
        }).catch(() => undefined),
      ),
    );
  }

  return jsonOk({ event: updated });
});
