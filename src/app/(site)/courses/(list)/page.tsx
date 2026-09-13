import { redirect } from "next/navigation";
import { getLocale, localePath } from "@/i18n";

/**
 * The course catalogue is gone.
 *
 * Courses are not sold from a shelf any more — they live inside a circle, and
 * the way to one is through the circle that contains it. A redirect rather
 * than a 404 because the old URL is in sitemaps, links and people's history,
 * and sending them to the thing that replaced it is kinder than a dead end.
 *
 * Individual course pages at /courses/[slug] still work: a direct link, a
 * receipt and the classroom all point at them.
 */
export default async function CoursesIndexRedirect() {
  redirect(localePath("/communities", await getLocale()));
}
