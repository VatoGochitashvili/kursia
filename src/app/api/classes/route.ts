import { beginMutation, handler, jsonCreated, jsonOk, readQuery } from "@/lib/api";
import { createCourseSchema, courseSearchSchema } from "@/lib/validation";
import { requireClassroomManager, requireCreator, requireUser } from "@/lib/auth/rbac";
import { readJson } from "@/lib/api";
import { createCourse } from "@/lib/course-authoring";
import { searchCourses } from "@/lib/courses";

export const runtime = "nodejs";

/**
 * Public course search. Exposed as JSON so a future native app consumes the
 * same catalogue the website renders.
 */
export const GET = handler(async (request) => {
  const params = readQuery(request, courseSearchSchema);
  const results = await searchCourses(params);
  return jsonOk(results);
});

/**
 * Create a draft lesson.
 *
 * For a creator, in their own circle. `creatorId` lets an admin the owner
 * appointed create one in the circle they help run — checked against the
 * database, never taken on trust.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, createCourseSchema);

  const creatorId = body.creatorId ?? (await requireCreator()).creatorId;
  await requireClassroomManager(creatorId);

  const course = await createCourse({
    creatorId,
    title: body.title,
    categoryId: body.categoryId,
    language: body.language,
  });

  return jsonCreated({ ...course, redirectTo: `/dashboard/creator/classes/${course.id}` });
});
