import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasCourseAccess } from "@/lib/auth/rbac";
import { nextLessonFor } from "@/lib/progress";

/**
 * Data for the learning player.
 *
 * The server decides which lesson the viewer may open and returns ONLY that
 * lesson's content. Locked lessons appear in the sidebar as titles, never with
 * their body, asset key or quiz answers — so there is nothing to unlock by
 * inspecting the payload.
 */

export interface LearnViewer {
  id: string;
  role: string;
  creatorId: string | null;
}

export async function loadLearnView(input: {
  slug: string;
  lessonId?: string;
  viewer: LearnViewer;
}) {
  const course = await db.course.findUnique({
    where: { slug: input.slug },
    select: {
      id: true, slug: true, title: true, status: true, hasCertificate: true,
      creatorId: true,
      creator: { select: { slug: true, displayName: true, userId: true } },
      modules: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, title: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, title: true, type: true,
              durationSeconds: true, isFreePreview: true,
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const access = await hasCourseAccess(input.viewer.id, course.id);

  // A course that is not published is only reachable by its creator or an admin.
  if (course.status !== "PUBLISHED" && !access.isOwner && !access.isAdmin) notFound();

  const orderedLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })),
  );
  if (orderedLessons.length === 0) notFound();

  // Which lesson to show: the requested one, else resume point, else the first.
  let targetId = input.lessonId;
  if (!targetId || !orderedLessons.some((l) => l.id === targetId)) {
    const resume = access.enrolled ? await nextLessonFor(input.viewer.id, course.id) : null;
    targetId = resume?.lessonId ?? orderedLessons[0]!.id;
  }

  const index = orderedLessons.findIndex((l) => l.id === targetId);
  const summary = orderedLessons[index]!;

  // THE gate: full lesson content is loaded only when the viewer is entitled,
  // or the lesson is an explicit free preview.
  const unlocked = access.canView || summary.isFreePreview;

  const lesson = unlocked
    ? await db.lesson.findUnique({
        where: { id: summary.id },
        select: {
          id: true, title: true, description: true, type: true,
          textContent: true, assetKey: true, captionsKey: true,
          durationSeconds: true, isFreePreview: true, courseId: true, moduleId: true,
          resources: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, sizeBytes: true, mimeType: true },
          },
          quiz: {
            select: {
              id: true, title: true, instructions: true,
              passingScore: true, maxAttempts: true, timeLimitMinutes: true,
              // Correct answers are deliberately NOT selected here — see
              // loadQuizForAttempt() below.
              questions: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true, prompt: true, type: true, points: true,
                  answers: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true } },
                },
              },
            },
          },
          assignment: {
            select: { id: true, title: true, instructions: true, maxPoints: true },
          },
        },
      })
    : null;

  const [progressRows, enrollment] = await Promise.all([
    db.lessonProgress.findMany({
      where: { userId: input.viewer.id, courseId: course.id },
      select: { lessonId: true, isCompleted: true, lastPositionSeconds: true },
    }),
    db.enrollment.findUnique({
      where: { userId_courseId: { userId: input.viewer.id, courseId: course.id } },
      select: { progressPercent: true, completedLessons: true, completedAt: true },
    }),
  ]);

  const progressByLesson = new Map(progressRows.map((r) => [r.lessonId, r]));
  const certificate = enrollment?.completedAt
    ? await db.certificate.findUnique({
        where: { userId_courseId: { userId: input.viewer.id, courseId: course.id } },
        select: { code: true },
      })
    : null;

  return {
    course,
    access,
    unlocked,
    lesson,
    lessonSummary: summary,
    previous: index > 0 ? orderedLessons[index - 1]! : null,
    next: index < orderedLessons.length - 1 ? orderedLessons[index + 1]! : null,
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({
        ...l,
        isCompleted: progressByLesson.get(l.id)?.isCompleted ?? false,
        // Sidebar rows carry only what the row itself renders.
        unlocked: access.canView || l.isFreePreview,
      })),
    })),
    lessonProgress: progressByLesson.get(summary.id) ?? null,
    totalLessons: orderedLessons.length,
    completedLessons: progressRows.filter((r) => r.isCompleted).length,
    progressPercent: enrollment?.progressPercent ?? 0,
    isComplete: Boolean(enrollment?.completedAt),
    certificateCode: certificate?.code ?? null,
  };
}

export type LearnView = Awaited<ReturnType<typeof loadLearnView>>;

/**
 * Quiz questions WITH correct answers — for server-side grading only.
 * Never returned to a client.
 */
export async function loadQuizForGrading(quizId: string) {
  return db.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true, passingScore: true, maxAttempts: true,
      lesson: { select: { id: true, courseId: true } },
      questions: {
        select: {
          id: true, type: true, points: true, explanation: true, prompt: true,
          answers: { select: { id: true, isCorrect: true, text: true } },
        },
      },
    },
  });
}

/** Redirect helper for `/learn/[slug]` without a lesson query. */
export async function resolveResumeRedirect(slug: string, userId: string): Promise<never> {
  const course = await db.course.findUnique({ where: { slug }, select: { id: true } });
  if (!course) notFound();
  const target = await nextLessonFor(userId, course.id);
  redirect(target ? `/learn/${slug}?lesson=${target.lessonId}` : `/courses/${slug}`);
}
