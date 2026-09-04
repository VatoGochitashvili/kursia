import { beginMutation, handler, jsonCreated, jsonOk, readQuery } from "@/lib/api";
import { createCourseSchema, courseSearchSchema } from "@/lib/validation";
import { requireCreator } from "@/lib/auth/rbac";
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

/** Create a draft course. Creators only. */
export const POST = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);
  const body = await readJson(request, createCourseSchema);

  const course = await createCourse({
    creatorId: creator.creatorId,
    title: body.title,
    categoryId: body.categoryId,
    language: body.language,
  });

  return jsonCreated({ ...course, redirectTo: `/dashboard/creator/courses/${course.id}` });
});
