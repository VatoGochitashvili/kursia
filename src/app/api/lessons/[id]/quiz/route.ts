import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { quizSchema } from "@/lib/validation";
import { requireCourseOwner } from "@/lib/auth/rbac";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Replace a lesson's quiz wholesale.
 *
 * The editor always sends the complete question set, so the quiz is rebuilt in
 * one transaction rather than diffed. Historic attempts keep their score even
 * though their question rows are replaced — `QuizAttempt` stores the computed
 * result, not a reference to a live answer key.
 */
export const PUT = handler(async (request, context: Ctx) => {
  const { id: lessonId } = await context.params;

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, quiz: { select: { id: true } } },
  });
  if (!lesson) throw notFoundError("გაკვეთილი ვერ მოიძებნა");

  const { user } = await requireCourseOwner(lesson.courseId);
  await beginMutation("write", user.id);

  const body = await readJson(request, quizSchema);

  const quiz = await db.$transaction(async (tx) => {
    const record = lesson.quiz
      ? await tx.quiz.update({
          where: { id: lesson.quiz.id },
          data: {
            title: body.title,
            instructions: body.instructions ?? null,
            passingScore: body.passingScore,
            maxAttempts: body.maxAttempts,
            shuffleQuestions: body.shuffleQuestions,
            timeLimitMinutes: body.timeLimitMinutes ?? null,
          },
          select: { id: true },
        })
      : await tx.quiz.create({
          data: {
            lessonId,
            title: body.title,
            instructions: body.instructions ?? null,
            passingScore: body.passingScore,
            maxAttempts: body.maxAttempts,
            shuffleQuestions: body.shuffleQuestions,
            timeLimitMinutes: body.timeLimitMinutes ?? null,
          },
          select: { id: true },
        });

    await tx.quizQuestion.deleteMany({ where: { quizId: record.id } });

    for (const [index, question] of body.questions.entries()) {
      await tx.quizQuestion.create({
        data: {
          quizId: record.id,
          prompt: question.prompt,
          type: question.type,
          explanation: question.explanation ?? null,
          points: question.points,
          sortOrder: index,
          answers: {
            create: question.answers.map((answer, answerIndex) => ({
              text: answer.text,
              isCorrect: answer.isCorrect,
              sortOrder: answerIndex,
            })),
          },
        },
      });
    }

    return record;
  });

  // Keep the lesson type consistent with the fact that it now holds a quiz.
  await db.lesson.update({ where: { id: lessonId }, data: { type: "QUIZ" } });

  return jsonOk({ id: quiz.id, questionCount: body.questions.length });
});

/** Editor payload — includes correct answers, so it is owner-only. */
export const GET = handler(async (_request, context: Ctx) => {
  const { id: lessonId } = await context.params;

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) throw notFoundError();
  await requireCourseOwner(lesson.courseId);

  const quiz = await db.quiz.findUnique({
    where: { lessonId },
    select: {
      id: true, title: true, instructions: true, passingScore: true,
      maxAttempts: true, shuffleQuestions: true, timeLimitMinutes: true,
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, prompt: true, type: true, explanation: true, points: true,
          answers: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, text: true, isCorrect: true },
          },
        },
      },
    },
  });

  return jsonOk({ quiz });
});
