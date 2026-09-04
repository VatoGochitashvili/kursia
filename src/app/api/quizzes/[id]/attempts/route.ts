import { db } from "@/lib/db";
import {
  ApiError, beginMutation, handler, jsonCreated, notFoundError, readJson,
} from "@/lib/api";
import { quizSubmitSchema } from "@/lib/validation";
import { requireUser, hasCourseAccess } from "@/lib/auth/rbac";
import { loadQuizForGrading } from "@/lib/learn";
import { saveLessonProgress } from "@/lib/progress";

export const runtime = "nodejs";

/**
 * Quiz submission and grading.
 *
 * Grading happens entirely on the server: correct answers are never sent to
 * the client (see the deliberately answer-free select in loadLearnView), so a
 * student cannot read them out of the page source or forge a score. The client
 * submits chosen answer ids; the score comes back from us.
 */
export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { id: quizId } = await context.params;

  const quiz = await loadQuizForGrading(quizId);
  if (!quiz) throw notFoundError("ქვიზი ვერ მოიძებნა");

  const access = await hasCourseAccess(user.id, quiz.lesson.courseId);
  if (!access.canView) throw new ApiError(403, "FORBIDDEN", "კურსზე წვდომა არ გაქვთ");

  // Attempt limits are enforced server-side.
  const previousAttempts = await db.quizAttempt.count({
    where: { quizId, userId: user.id, submittedAt: { not: null } },
  });
  if (quiz.maxAttempts > 0 && previousAttempts >= quiz.maxAttempts) {
    throw new ApiError(409, "NO_ATTEMPTS_LEFT", "ცდები ამოიწურა");
  }

  const body = await readJson(request, quizSubmitSchema);
  const submitted = new Map(body.answers.map((a) => [a.questionId, new Set(a.answerIds)]));

  let pointsEarned = 0;
  let pointsTotal = 0;

  const results = quiz.questions.map((question) => {
    pointsTotal += question.points;

    const correctIds = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id));
    const chosenIds = submitted.get(question.id) ?? new Set<string>();
    // Only answers that actually belong to this question count — a forged id
    // is simply ignored rather than treated as correct.
    const validChosen = new Set(
      [...chosenIds].filter((cid) => question.answers.some((a) => a.id === cid)),
    );

    // All correct answers chosen, and nothing incorrect. Partial credit is
    // deliberately not awarded for multi-answer questions.
    const isCorrect =
      validChosen.size === correctIds.size &&
      [...validChosen].every((cid) => correctIds.has(cid));

    if (isCorrect) pointsEarned += question.points;

    return {
      questionId: question.id,
      prompt: question.prompt,
      isCorrect,
      explanation: question.explanation,
      chosenIds: [...validChosen],
      correctIds: [...correctIds],
    };
  });

  const scorePercent = pointsTotal > 0 ? Math.round((pointsEarned / pointsTotal) * 100) : 0;
  const isPassed = scorePercent >= quiz.passingScore;

  // One row per chosen answer; an unanswered question still records a row so
  // the attempt is a complete account of what the student submitted.
  const attemptAnswers: { questionId: string; answerId: string | null; isCorrect: boolean }[] = [];
  for (const r of results) {
    if (r.chosenIds.length === 0) {
      attemptAnswers.push({ questionId: r.questionId, answerId: null, isCorrect: false });
      continue;
    }
    for (const answerId of r.chosenIds) {
      attemptAnswers.push({ questionId: r.questionId, answerId, isCorrect: r.isCorrect });
    }
  }

  const attempt = await db.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      attemptNo: previousAttempts + 1,
      scorePercent,
      pointsEarned,
      pointsTotal,
      isPassed,
      submittedAt: new Date(),
      answers: { create: attemptAnswers },
    },
    select: { id: true },
  });

  // Passing the quiz completes the lesson, which advances course progress and
  // can trigger certificate issue — all through the same progress pipeline.
  let progress = null;
  if (isPassed && access.enrolled) {
    progress = await saveLessonProgress({
      userId: user.id,
      courseId: quiz.lesson.courseId,
      lessonId: quiz.lesson.id,
      isCompleted: true,
    });
  }

  return jsonCreated({
    attemptId: attempt.id,
    scorePercent,
    pointsEarned,
    pointsTotal,
    isPassed,
    passingScore: quiz.passingScore,
    attemptsUsed: previousAttempts + 1,
    maxAttempts: quiz.maxAttempts,
    // Correct answers are revealed only AFTER a submission — never before.
    results,
    progress,
  });
});
