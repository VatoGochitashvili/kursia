import { z } from "zod";
import { db } from "@/lib/db";
import {
  ApiError, beginMutation, conflict, handler, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { hasCourseAccess, requireUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Handing work in, and marking it.
 *
 * POST is the student submitting; PATCH is the creator reviewing. They share
 * a route because they share a row, but they authorise on opposite sides:
 * submitting needs enrolment, reviewing needs ownership.
 */
async function loadAssignment(assignmentId: string) {
  const user = await requireUser();

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      title: true,
      maxPoints: true,
      allowFileUpload: true,
      lesson: {
        select: {
          id: true,
          courseId: true,
          course: { select: { slug: true, title: true, creator: { select: { userId: true } } } },
        },
      },
    },
  });
  if (!assignment) throw notFoundError("დავალება ვერ მოიძებნა");
  return { assignment, user };
}

const submitSchema = z
  .object({
    body: z.string().trim().max(20000).optional(),
    /** Storage key from a prior upload with kind=submission. */
    assetKey: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.body?.length) || Boolean(v.assetKey?.length), {
    message: "დაწერე პასუხი ან ატვირთე ფაილი",
  });

export const POST = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { assignment, user } = await loadAssignment(id);
  await beginMutation("write", user.id);

  const access = await hasCourseAccess(user.id, assignment.lesson.courseId);
  if (!access.enrolled) throw new ApiError(403, "FORBIDDEN", "კურსზე წვდომა არ გაქვთ");

  const body = await readJson(request, submitSchema);
  if (body.assetKey && !assignment.allowFileUpload) {
    throw conflict("ამ დავალებაზე ფაილის ატვირთვა გამორთულია");
  }

  const existing = await db.assignmentSubmission.findUnique({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId: user.id } },
    select: { id: true, status: true },
  });

  // Resubmitting before it has been marked is editing a draft. Resubmitting
  // after it has been marked would silently erase the creator's feedback and
  // score, so that is refused rather than quietly overwritten.
  if (existing?.status === "REVIEWED") {
    throw conflict("დავალება უკვე შემოწმებულია");
  }

  const submission = await db.assignmentSubmission.upsert({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId: user.id } },
    create: {
      assignmentId: assignment.id,
      userId: user.id,
      body: body.body || null,
      assetKey: body.assetKey || null,
    },
    update: {
      body: body.body || null,
      assetKey: body.assetKey || null,
      submittedAt: new Date(),
    },
    select: { id: true, status: true, submittedAt: true },
  });

  // Tell the creator there is something to mark. Only on a first submission —
  // a student polishing a draft should not ping them every time.
  if (!existing) {
    await notify({
      userId: assignment.lesson.course.creator.userId,
      type: "ASSIGNMENT_SUBMITTED",
      title: "ახალი დავალება შესამოწმებლად",
      body: `${assignment.title} — ${assignment.lesson.course.title}`,
      linkUrl: `/learn/${assignment.lesson.course.slug}?lesson=${assignment.lesson.id}`,
    }).catch(() => undefined);
  }

  return jsonOk({ submission });
});

const reviewSchema = z
  .object({
    submissionId: cuid,
    points: z.number().int().min(0).optional(),
    feedback: z.string().trim().max(8000).optional(),
  })
  .strict();

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { assignment, user } = await loadAssignment(id);
  await beginMutation("write", user.id);

  const access = await hasCourseAccess(user.id, assignment.lesson.courseId);
  if (!access.isOwner && !access.isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "შემოწმების უფლება არ გაქვთ");
  }

  const body = await readJson(request, reviewSchema);
  if (body.points !== undefined && body.points > assignment.maxPoints) {
    throw conflict(`მაქსიმალური ქულაა ${assignment.maxPoints}`);
  }

  // Scoped to this assignment, so an id belonging to another course cannot be
  // marked by someone who merely owns this one.
  const submission = await db.assignmentSubmission.findFirst({
    where: { id: body.submissionId, assignmentId: assignment.id },
    select: { id: true, userId: true },
  });
  if (!submission) throw notFoundError("ნამუშევარი ვერ მოიძებნა");

  await db.assignmentSubmission.update({
    where: { id: submission.id },
    data: {
      points: body.points,
      feedback: body.feedback || null,
      status: "REVIEWED",
      reviewedAt: new Date(),
    },
  });

  await notify({
    userId: submission.userId,
    type: "ASSIGNMENT_REVIEWED",
    title: "დავალება შემოწმდა",
    body: `${assignment.title}${
      body.points !== undefined ? ` — ${body.points}/${assignment.maxPoints}` : ""
    }`,
    linkUrl: `/learn/${assignment.lesson.course.slug}?lesson=${assignment.lesson.id}`,
  }).catch(() => undefined);

  return jsonOk({ ok: true });
});
