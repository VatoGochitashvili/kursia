import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonCreated, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireCreator } from "@/lib/auth/rbac";
import { notify, absoluteUrl } from "@/lib/notifications";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * A creator messaging their own students.
 *
 * "Their own" is the whole security model here, and it is enforced by the
 * query rather than by a check: recipients are derived from enrolments on
 * courses this creator owns, so there is no request shape that reaches
 * anybody else. A creator cannot address a list; they can only address
 * people who bought from them.
 *
 * Email is opt-in per announcement. Notifications always go; email only when
 * asked for, because a creator with a back catalogue could otherwise turn a
 * routine update into five inbox messages.
 */

/** Enough to stop this becoming a mailing list, loose enough to be useful. */
const MAX_PER_DAY = 3;

/**
 * A hard ceiling on one send. Past this the fan-out would hold a request open
 * long enough to time out, and a creator with a very large audience needs a
 * queue, not a bigger loop.
 */
const MAX_RECIPIENTS = 2000;

const createSchema = z
  .object({
    courseId: z.union([cuid, z.literal("")]).optional(),
    subject: z.string().trim().min(3, "სათაური სავალდებულოა").max(160),
    body: z.string().trim().min(10, "ტექსტი ძალიან მოკლეა").max(5000),
    sendEmail: z.boolean().optional(),
  })
  .strict();

export const GET = handler(async () => {
  const creator = await requireCreator();

  const announcements = await db.announcement.findMany({
    where: { creatorId: creator.creatorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, subject: true, body: true, sendEmail: true,
      recipientCount: true, createdAt: true,
      course: { select: { id: true, title: true } },
    },
  });

  return jsonOk({ announcements });
});

export const POST = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);
  const body = await readJson(request, createSchema);

  const since = new Date(Date.now() - 86_400_000);
  const sentToday = await db.announcement.count({
    where: { creatorId: creator.creatorId, createdAt: { gte: since } },
  });
  if (sentToday >= MAX_PER_DAY) {
    throw conflict(`დღეში ${MAX_PER_DAY} შეტყობინებაზე მეტს ვერ გააგზავნი`);
  }

  // Scoping to a course means scoping to one of YOUR courses.
  if (body.courseId) {
    const owned = await db.course.count({
      where: { id: body.courseId, creatorId: creator.creatorId },
    });
    if (owned === 0) throw notFoundError("კურსი ვერ მოიძებნა");
  }

  // Recipients come from enrolments on this creator's courses. Revoked
  // enrolments are excluded: someone who refunded is no longer their student.
  const enrolments = await db.enrollment.findMany({
    where: {
      revokedAt: null,
      course: body.courseId
        ? { id: body.courseId, creatorId: creator.creatorId }
        : { creatorId: creator.creatorId },
      user: { status: "ACTIVE" },
    },
    select: { userId: true, course: { select: { slug: true } } },
    take: MAX_RECIPIENTS,
  });

  // One person enrolled on three of this creator's courses gets one message,
  // not three.
  const byUser = new Map<string, string>();
  for (const enrolment of enrolments) {
    if (!byUser.has(enrolment.userId)) byUser.set(enrolment.userId, enrolment.course.slug);
  }

  const announcement = await db.announcement.create({
    data: {
      creatorId: creator.creatorId,
      courseId: body.courseId || null,
      subject: body.subject,
      body: body.body,
      sendEmail: body.sendEmail ?? false,
      recipientCount: byUser.size,
    },
    select: { id: true, subject: true, recipientCount: true, createdAt: true },
  });

  // Delivery is best-effort per recipient: one bad address must not stop the
  // rest of the send, and the announcement row is already written either way.
  await Promise.all(
    [...byUser.entries()].map(([userId, slug]) =>
      notify({
        userId,
        type: "ANNOUNCEMENT",
        title: body.subject,
        body: body.body.slice(0, 300),
        linkUrl: `/learn/${slug}`,
        email: body.sendEmail
          ? {
              template: "genericNotification",
              payload: {
                title: body.subject,
                message: body.body,
                url: absoluteUrl(`/learn/${slug}`),
              },
            }
          : undefined,
      }).catch(() => undefined),
    ),
  );

  return jsonCreated({ announcement });
});
