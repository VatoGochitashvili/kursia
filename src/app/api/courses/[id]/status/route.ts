import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { courseTransitionSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { checkPublishReadiness, transitionCourse } from "@/lib/course-authoring";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Readiness checklist — powers the "ready to submit?" panel in the builder. */
export const GET = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  await requireCourseOwner(id);
  const issues = await checkPublishReadiness(id);
  return jsonOk({ ready: issues.length === 0, issues });
});

/**
 * Move the course through the moderation workflow.
 * Permission per target status is enforced inside `transitionCourse`.
 */
export const POST = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { user } = await requireCourseOwner(id);
  await beginMutation("write", user.id);

  const body = await readJson(request, courseTransitionSchema);
  const course = await transitionCourse({
    courseId: id,
    to: body.to,
    actorId: user.id,
    actorRole: user.role,
    note: body.note,
  });

  return jsonOk(course);
});
