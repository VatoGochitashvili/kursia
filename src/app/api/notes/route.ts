import { db } from "@/lib/db";
import {
  ApiError, beginMutation, handler, jsonOk, jsonCreated, readJson, notFoundError,
} from "@/lib/api";
import { noteSchema } from "@/lib/validation";
import { requireUser, hasCourseAccess } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, noteSchema);

  const lesson = await db.lesson.findUnique({
    where: { id: body.lessonId },
    select: { courseId: true },
  });
  if (!lesson) throw notFoundError();

  const access = await hasCourseAccess(user.id, lesson.courseId);
  if (!access.canView) throw new ApiError(403, "FORBIDDEN", "კურსზე წვდომა არ გაქვთ");

  const note = await db.lessonNote.create({
    data: {
      userId: user.id,
      lessonId: body.lessonId,
      body: body.body,
      positionSeconds: body.positionSeconds ?? null,
    },
    select: { id: true, body: true, positionSeconds: true, createdAt: true },
  });

  return jsonCreated(note);
});

export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const id = new URL(request.url).searchParams.get("id") ?? "";

  // Scoped by userId, so one student can never delete another's note.
  const result = await db.lessonNote.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) throw notFoundError();

  return jsonOk({ ok: true });
});
