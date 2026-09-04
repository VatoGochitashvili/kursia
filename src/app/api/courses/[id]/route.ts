import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonOk, readJson } from "@/lib/api";
import { updateCourseSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { updateCourse } from "@/lib/course-authoring";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { user } = await requireCourseOwner(id);
  await beginMutation("write", user.id);

  const body = await readJson(request, updateCourseSchema);
  const course = await updateCourse(id, body);

  return jsonOk(course);
});

export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const { user, course } = await requireCourseOwner(id);
  await beginMutation("write", user.id);

  // A course with paid enrolments is never destroyed — students would lose
  // content they bought. It is archived instead.
  const enrolments = await db.enrollment.count({ where: { courseId: id } });
  if (enrolments > 0) {
    await db.course.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit({
      actorId: user.id,
      action: AUDIT_ACTIONS.COURSE_STATUS_CHANGED,
      targetType: "Course",
      targetId: id,
      summary: `${course.title}: archived instead of deleted (${enrolments} enrolments)`,
    });
    return jsonOk({ ok: true, archived: true });
  }

  await db.course.delete({ where: { id } });
  await audit({
    actorId: user.id,
    action: AUDIT_ACTIONS.COURSE_DELETED,
    targetType: "Course",
    targetId: id,
    summary: course.title,
  });

  return jsonOk({ ok: true, deleted: true });
});
