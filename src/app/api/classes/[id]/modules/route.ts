import { db } from "@/lib/db";
import { beginMutation, handler, jsonCreated, jsonOk, readJson } from "@/lib/api";
import { moduleSchema, reorderSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { refreshCourseAggregates } from "@/lib/progress";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Add a module to the end of the curriculum. */
export const POST = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { user } = await requireCourseOwner(id);
  await beginMutation("write", user.id);

  const body = await readJson(request, moduleSchema);
  const last = await db.courseModule.findFirst({
    where: { courseId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await db.courseModule.create({
    data: {
      courseId: id,
      title: body.title,
      description: body.description ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true, title: true, description: true, sortOrder: true },
  });

  await refreshCourseAggregates(id);
  return jsonCreated({ ...created, lessons: [] });
});

/**
 * Reorder modules from an explicit ordered id list.
 * Ids that do not belong to this course are ignored, so a crafted payload
 * cannot reshuffle another creator's curriculum.
 */
export const PATCH = handler(async (request, context: Ctx) => {
  const { id } = await context.params;
  const { user } = await requireCourseOwner(id);
  await beginMutation("write", user.id);

  const { ids } = await readJson(request, reorderSchema);
  const owned = await db.courseModule.findMany({
    where: { courseId: id, id: { in: ids } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((m) => m.id));

  await db.$transaction(
    ids
      .filter((moduleId) => ownedIds.has(moduleId))
      .map((moduleId, index) =>
        db.courseModule.update({ where: { id: moduleId }, data: { sortOrder: index } }),
      ),
  );

  return jsonOk({ ok: true });
});
