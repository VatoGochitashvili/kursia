import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { hasCourseAccess, requireCourseOwner, requireUser } from "@/lib/auth/rbac";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The assignment attached to one lesson.
 *
 * A lesson has at most one, so this is an upsert rather than a collection —
 * `Assignment.lessonId` is unique, and that is the right shape: an assignment
 * IS the lesson's content, the way a quiz is.
 *
 * GET serves two audiences from one route, deliberately. The creator gets the
 * brief plus every submission; a student gets the brief plus their own
 * submission and nothing else — another student's work is none of their
 * business, and a shared endpoint that forgets to branch is how that leaks.
 */
const upsertSchema = z
  .object({
    title: z.string().trim().min(1, "სათაური სავალდებულოა").max(200),
    instructions: z.string().trim().min(1, "აღწერა სავალდებულოა").max(8000),
    allowFileUpload: z.boolean().optional(),
    maxPoints: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

async function loadLesson(lessonId: string) {
  // Authenticate before the lookup, so the status code cannot be used to
  // probe which lesson ids exist.
  const user = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, type: true },
  });
  if (!lesson) throw notFoundError("გაკვეთილი ვერ მოიძებნა");
  return { lesson, user };
}

export const GET = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const { lesson, user } = await loadLesson(id);

  const access = await hasCourseAccess(user.id, lesson.courseId);
  if (!access.canView) throw notFoundError("გაკვეთილი ვერ მოიძებნა");

  const assignment = await db.assignment.findUnique({
    where: { lessonId: id },
    select: {
      id: true,
      title: true,
      instructions: true,
      allowFileUpload: true,
      maxPoints: true,
    },
  });
  if (!assignment) return jsonOk({ assignment: null, submissions: [], mine: null });

  const canReview = access.isOwner || access.isAdmin;

  if (canReview) {
    const submissions = await db.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
      select: {
        id: true, body: true, assetKey: true, status: true, points: true,
        feedback: true, submittedAt: true, reviewedAt: true,
        user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
      },
    });
    return jsonOk({ assignment, submissions, mine: null, canReview: true });
  }

  const mine = await db.assignmentSubmission.findUnique({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId: user.id } },
    select: {
      id: true, body: true, assetKey: true, status: true, points: true,
      feedback: true, submittedAt: true, reviewedAt: true,
    },
  });

  return jsonOk({ assignment, submissions: [], mine, canReview: false });
});

export const PUT = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { lesson } = await loadLesson(id);
  const { user } = await requireCourseOwner(lesson.courseId);
  await beginMutation("write", user.id);

  const body = await readJson(request, upsertSchema);

  const assignment = await db.assignment.upsert({
    where: { lessonId: id },
    create: {
      lessonId: id,
      title: body.title,
      instructions: body.instructions,
      allowFileUpload: body.allowFileUpload ?? true,
      maxPoints: body.maxPoints ?? 100,
    },
    update: {
      title: body.title,
      instructions: body.instructions,
      allowFileUpload: body.allowFileUpload,
      maxPoints: body.maxPoints,
    },
    select: {
      id: true, title: true, instructions: true, allowFileUpload: true, maxPoints: true,
    },
  });

  return jsonOk({ assignment });
});

export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const { lesson } = await loadLesson(id);
  const { user } = await requireCourseOwner(lesson.courseId);
  await beginMutation("write", user.id);

  // Submissions cascade with it. Anything a student handed in goes too, which
  // is why this is only reachable from the creator's own editor.
  await db.assignment.deleteMany({ where: { lessonId: id } });
  return jsonOk({ ok: true });
});
