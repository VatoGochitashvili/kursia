import { db } from "@/lib/db";
import { issueCertificate } from "@/lib/certificates";

/**
 * Progress tracking.
 *
 * Percentages are recomputed from the lesson table rather than incremented,
 * so adding or removing a lesson cannot leave a student stuck at 103%.
 * Only published lessons count toward completion.
 */

export async function countableLessons(courseId: string): Promise<string[]> {
  const lessons = await db.lesson.findMany({
    where: { courseId, isPublished: true },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  return lessons.map((l) => l.id);
}

export interface ProgressSnapshot {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  isComplete: boolean;
  certificateCode?: string;
}

/**
 * Recompute and persist a student's progress for one course.
 * Issues a certificate the first time the course reaches 100%.
 */
export async function recomputeProgress(
  userId: string,
  courseId: string,
): Promise<ProgressSnapshot> {
  const lessonIds = await countableLessons(courseId);
  const total = lessonIds.length;

  const completed = total
    ? await db.lessonProgress.count({
        where: { userId, courseId, isCompleted: true, lessonId: { in: lessonIds } },
      })
    : 0;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isComplete = total > 0 && completed >= total;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, completedAt: true, startedAt: true },
  });

  if (enrollment) {
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent: percent,
        completedLessons: completed,
        startedAt: enrollment.startedAt ?? new Date(),
        completedAt: isComplete ? (enrollment.completedAt ?? new Date()) : null,
      },
    });
  }

  const snapshot: ProgressSnapshot = {
    totalLessons: total,
    completedLessons: completed,
    progressPercent: percent,
    isComplete,
  };

  if (isComplete) {
    const cert = await issueCertificate(userId, courseId);
    if (cert) snapshot.certificateCode = cert.code;
  }

  return snapshot;
}

/** Save a resume position / completion for one lesson, then recompute. */
export async function saveLessonProgress(input: {
  userId: string;
  courseId: string;
  lessonId: string;
  positionSeconds?: number;
  watchedSeconds?: number;
  isCompleted?: boolean;
}): Promise<ProgressSnapshot> {
  const existing = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: input.userId, lessonId: input.lessonId } },
    select: { watchedSeconds: true, isCompleted: true },
  });

  const completed = input.isCompleted ?? existing?.isCompleted ?? false;

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: input.userId, lessonId: input.lessonId } },
    create: {
      userId: input.userId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      lastPositionSeconds: input.positionSeconds ?? 0,
      watchedSeconds: input.watchedSeconds ?? 0,
      isCompleted: completed,
      completedAt: completed ? new Date() : null,
    },
    update: {
      ...(input.positionSeconds !== undefined
        ? { lastPositionSeconds: input.positionSeconds }
        : {}),
      // Watch time only ever moves forward — re-watching must not reduce it.
      ...(input.watchedSeconds !== undefined
        ? { watchedSeconds: Math.max(input.watchedSeconds, existing?.watchedSeconds ?? 0) }
        : {}),
      ...(input.isCompleted !== undefined
        ? { isCompleted: input.isCompleted, completedAt: input.isCompleted ? new Date() : null }
        : {}),
    },
  });

  await db.enrollment.updateMany({
    where: { userId: input.userId, courseId: input.courseId },
    data: { lastLessonId: input.lessonId },
  });

  return recomputeProgress(input.userId, input.courseId);
}

/**
 * The lesson "Continue learning" should open: the last one touched if it is
 * unfinished, otherwise the first incomplete lesson, otherwise lesson one.
 */
export async function nextLessonFor(
  userId: string,
  courseId: string,
): Promise<{ lessonId: string; moduleId: string } | null> {
  const lessons = await db.lesson.findMany({
    where: { courseId, isPublished: true },
    select: { id: true, moduleId: true, sortOrder: true, module: { select: { sortOrder: true } } },
  });
  if (lessons.length === 0) return null;

  const ordered = lessons.sort(
    (a, b) => a.module.sortOrder - b.module.sortOrder || a.sortOrder - b.sortOrder,
  );

  const [progress, enrollment] = await Promise.all([
    db.lessonProgress.findMany({
      where: { userId, courseId },
      select: { lessonId: true, isCompleted: true },
    }),
    db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { lastLessonId: true },
    }),
  ]);

  const done = new Set(progress.filter((p) => p.isCompleted).map((p) => p.lessonId));

  if (enrollment?.lastLessonId && !done.has(enrollment.lastLessonId)) {
    const last = ordered.find((l) => l.id === enrollment.lastLessonId);
    if (last) return { lessonId: last.id, moduleId: last.moduleId };
  }

  const nextIncomplete = ordered.find((l) => !done.has(l.id));
  const target = nextIncomplete ?? ordered[0]!;
  return { lessonId: target.id, moduleId: target.moduleId };
}

/** Denormalised course aggregates, recomputed after curriculum edits. */
export async function refreshCourseAggregates(courseId: string): Promise<void> {
  const [lessons, moduleCount] = await Promise.all([
    db.lesson.findMany({
      where: { courseId, isPublished: true },
      select: { durationSeconds: true },
    }),
    db.courseModule.count({ where: { courseId } }),
  ]);

  await db.course.update({
    where: { id: courseId },
    data: {
      lessonCount: lessons.length,
      moduleCount,
      durationSeconds: lessons.reduce((sum, l) => sum + l.durationSeconds, 0),
    },
  });
}

/** Recompute a course's rating from visible reviews only. */
export async function refreshCourseRating(courseId: string): Promise<void> {
  const agg = await db.review.aggregate({
    where: { courseId, status: "VISIBLE" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await db.course.update({
    where: { id: courseId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
      ratingCount: agg._count._all,
    },
  });
}
