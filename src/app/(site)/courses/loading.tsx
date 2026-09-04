import { CourseCardSkeleton } from "@/components/course/CourseCard";

/** Streamed instantly while the catalogue query runs. */
export default function CoursesLoading() {
  return (
    <div className="container-page py-10">
      <div className="skeleton mb-3 h-9 w-56 rounded-lg" />
      <div className="skeleton mb-8 h-11 w-full max-w-xl rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
