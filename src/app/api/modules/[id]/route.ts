import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { moduleSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { refreshCourseAggregates } from "@/lib/progress";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Resolve the module's course first, then authorise against THAT course. */
async function authorizeModule(moduleId: string) {
  const module = await db.courseModule.findUnique({
    where: { id: moduleId },
    select: { id: true, courseId: true },
  });
  if (!module) throw notFoundError("მოდული ვერ მოიძებნა");
  const { user } = await requireCourseOwner(module.courseId);
  return { module, user };
}

export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { module, user } = await authorizeModule(id);
  await beginMutation("write", user.id);

  const body = await readJson(request, moduleSchema.partial());
  const updated = await db.courseModule.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description === "" ? null : body.description,
    },
    select: { id: true, title: true, description: true, sortOrder: true },
  });

  return jsonOk(updated);
});

export const DELETE = handler(async (_request, context: Ctx) => {
  const { id } = await context.params;
  const { module, user } = await authorizeModule(id);
  await beginMutation("write", user.id);

  // Lessons cascade with the module (see the schema relation).
  await db.courseModule.delete({ where: { id } });
  await refreshCourseAggregates(module.courseId);

  return jsonOk({ ok: true });
});
