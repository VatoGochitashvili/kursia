import { z } from "zod";
import { db } from "@/lib/db";
import {
  ApiError, beginMutation, conflict, handler, jsonCreated, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getSessionUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/community";
import { notify } from "@/lib/notifications";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Live sessions in a creator's community.
 *
 * Same membership rule as the feed, from the same function, and it gates the
 * whole endpoint rather than individual fields. That is what protects the
 * join link: a non-member never gets a response to read it out of, so a
 * leaked event id cannot become a leaked meeting room.
 */
const createSchema = z
  .object({
    creatorId: cuid,
    courseId: z.union([cuid, z.literal("")]).optional(),
    title: z.string().trim().min(3, "სათაური სავალდებულოა").max(160),
    description: z.string().trim().max(4000).optional(),
    joinUrl: z.union([z.string().trim().url("არასწორი ბმული").max(1000), z.literal("")]).optional(),
    /** ISO instants. The client converts from the creator's local time. */
    startsAt: z.string().trim().min(1),
    endsAt: z.string().trim().min(1),
    timezone: z.string().trim().max(64).optional(),
  })
  .strict();

export const GET = handler(async (request) => {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get("creatorId") ?? "";
  const past = url.searchParams.get("past") === "1";

  const viewer = await getSessionUser();
  const membership = await getMembership(viewer?.id ?? null, creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }

  const now = new Date();
  const events = await db.event.findMany({
    where: {
      creatorId,
      // Both tabs pivot on the SAME field, so the two sets partition the
      // calendar exactly. Pivoting "past" on startsAt instead would put a
      // session that has begun but not finished into both lists at once.
      ...(past ? { endsAt: { lt: now } } : { endsAt: { gte: now } }),
    },
    orderBy: { startsAt: past ? "desc" : "asc" },
    take: 50,
    select: {
      id: true, title: true, description: true, joinUrl: true,
      startsAt: true, endsAt: true, timezone: true, isCancelled: true,
      course: { select: { slug: true, title: true } },
      _count: { select: { attendees: true } },
    },
  });

  const mine = viewer
    ? new Set(
        (
          await db.eventAttendee.findMany({
            where: { userId: viewer.id, eventId: { in: events.map((e) => e.id) } },
            select: { eventId: true },
          })
        ).map((a) => a.eventId),
      )
    : new Set<string>();

  return jsonOk({
    events: events.map((event) => ({
      ...event,
      attendeeCount: event._count.attendees,
      attending: mine.has(event.id),
      _count: undefined,
    })),
    membership,
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, createSchema);

  const membership = await getMembership(user.id, body.creatorId);
  // Members attend; only the creator schedules.
  if (!membership.isOwner && !membership.isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "შეხვედრის დანიშვნა მხოლოდ ავტორს შეუძლია");
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw conflict("თარიღი არასწორია");
  }
  // An event that ends before it starts is a typo, not a schedule.
  if (endsAt <= startsAt) throw conflict("დასრულება დაწყებაზე ადრე ვერ იქნება");

  if (body.courseId) {
    const owned = await db.course.count({
      where: { id: body.courseId, creatorId: body.creatorId },
    });
    if (owned === 0) throw notFoundError("კურსი ვერ მოიძებნა");
  }

  const event = await db.event.create({
    data: {
      creatorId: body.creatorId,
      courseId: body.courseId || null,
      title: body.title,
      description: body.description || null,
      joinUrl: body.joinUrl || null,
      startsAt,
      endsAt,
      timezone: body.timezone || "Asia/Tbilisi",
    },
    select: { id: true, title: true, startsAt: true },
  });

  // Tell the community there is something in the diary. Notifications only —
  // a creator scheduling a term's worth of sessions should not send a term's
  // worth of email in one sitting.
  const creator = await db.creatorProfile.findUnique({
    where: { id: body.creatorId },
    select: { slug: true },
  });
  const members = await db.enrollment.findMany({
    where: {
      revokedAt: null,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
      course: body.courseId
        ? { id: body.courseId, creatorId: body.creatorId }
        : { creatorId: body.creatorId },
      user: { status: "ACTIVE" },
    },
    select: { userId: true },
    take: 2000,
  });

  const unique = [...new Set(members.map((m) => m.userId))];
  await Promise.all(
    unique.map((userId) =>
      notify({
        userId,
        type: "EVENT_SCHEDULED",
        title: "ახალი შეხვედრა დაინიშნა",
        body: event.title,
        linkUrl: creator ? `/community/${creator.slug}/events` : undefined,
      }).catch(() => undefined),
    ),
  );

  return jsonCreated({ event });
});
