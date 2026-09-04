import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { loadLearnView } from "@/lib/learn";
import { paragraphsToHtml } from "@/lib/sanitize";
import { LearnShell, LockedLesson } from "@/components/learn/LearnShell";
import { QuizRunner } from "@/components/learn/QuizRunner";
import { CommentsPanel, NotesPanel, type CommentItem } from "@/components/learn/LessonPanels";
import { LessonResources, PdfLesson } from "@/components/learn/LessonContent";
import { Alert, Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** The player is private and personalised — never cached, never indexed. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

export default async function LearnPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;
  const { locale, t } = await getI18n();

  // Signing in is required before anything is loaded; the `next` param brings
  // the student straight back to the lesson they clicked.
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect(
      `${localePath("/login", locale)}?next=${encodeURIComponent(
        `/learn/${slug}${lessonParam ? `?lesson=${lessonParam}` : ""}`,
      )}`,
    );
  }

  const view = await loadLearnView({
    slug,
    lessonId: lessonParam,
    viewer: { id: user.id, role: user.role, creatorId: user.creatorId },
  });

  const [notes, comments, quizAttempts] = await Promise.all([
    db.lessonNote.findMany({
      where: { userId: user.id, lessonId: view.lessonSummary.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, body: true, positionSeconds: true, createdAt: true },
    }),
    db.comment.findMany({
      where: { lessonId: view.lessonSummary.id, parentId: null, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, body: true, createdAt: true, isQuestion: true, likeCount: true,
        user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        likes: { where: { userId: user.id }, select: { id: true } },
        replies: {
          where: { status: "VISIBLE" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true, body: true, createdAt: true, isQuestion: true, likeCount: true,
            user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
          },
        },
      },
    }),
    view.lesson?.quiz
      ? db.quizAttempt.count({
          where: { quizId: view.lesson.quiz.id, userId: user.id, submittedAt: { not: null } },
        })
      : Promise.resolve(0),
  ]);

  const commentItems: CommentItem[] = comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    isQuestion: c.isQuestion,
    likeCount: c.likeCount,
    likedByMe: c.likes.length > 0,
    user: {
      id: c.user.id,
      fullName: c.user.profile?.fullName ?? "—",
      avatarUrl: c.user.profile?.avatarUrl ?? null,
    },
    replies: c.replies.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      isQuestion: r.isQuestion,
      likeCount: r.likeCount,
      likedByMe: false,
      user: {
        id: r.user.id,
        fullName: r.user.profile?.fullName ?? "—",
        avatarUrl: r.user.profile?.avatarUrl ?? null,
      },
    })),
  }));

  const lesson = view.lesson;
  const p = (path: string) => localePath(path, locale);

  const sharedLabels = {
    curriculum: t.learn.curriculum,
    completed: t.learn.completed,
    preview: t.courses.previewLesson,
    lockedHint: t.courses.lockedHint,
    close: t.common.close,
    backToCourse: t.common.back,
    overview: t.learn.overview,
    notes: t.learn.notes,
    discussion: t.learn.discussion,
    resources: t.learn.resources,
    markComplete: t.learn.markComplete,
    markedComplete: t.learn.markedComplete,
    prevLesson: t.learn.prevLesson,
    nextLesson: t.learn.nextLesson,
    player: t.learn.overview,
    play: t.common.open,
    pause: t.common.close,
    seek: t.learn.courseProgress,
    volume: t.learn.quality,
    playbackSpeed: t.learn.playbackSpeed,
    fullscreen: t.learn.quality,
    captions: t.learn.captions,
    back10: "-10s",
    videoUnavailable: t.common.somethingWrong,
    locked: t.courses.locked,
    buyNow: t.courses.buyNow,
  };

  return (
    <LearnShell
      courseSlug={view.course.slug}
      courseTitle={view.course.title}
      lessonId={view.lessonSummary.id}
      lessonTitle={view.lessonSummary.title}
      lessonType={view.lessonSummary.type}
      isVideo={Boolean(view.unlocked && lesson?.type === "VIDEO" && lesson.assetKey)}
      posterUrl={null}
      resumeAt={view.lessonProgress?.lastPositionSeconds ?? 0}
      isCompleted={view.lessonProgress?.isCompleted ?? false}
      isEnrolled={view.access.enrolled}
      modules={view.modules}
      progressPercent={view.progressPercent}
      completedLessons={view.completedLessons}
      totalLessons={view.totalLessons}
      previous={view.previous}
      next={view.next}
      locale={locale}
      labels={sharedLabels}
      tabs={{
        overview: (
          <div className="space-y-5">
            {lesson?.description ? (
              <div
                className="prose-course max-w-prose"
                dangerouslySetInnerHTML={{ __html: paragraphsToHtml(lesson.description) }}
              />
            ) : (
              <p className="text-[13px] text-ink-subtle">{t.common.empty}</p>
            )}

            {view.isComplete && (
              <Card className="border-success-500/30 bg-success-50 p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-500 text-white">
                    <Icon name="award" size={20} />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-ink">{t.learn.courseComplete}</p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">{t.learn.courseCompleteBody}</p>
                    {view.certificateCode && (
                      <ButtonLink
                        className="mt-3"
                        size="sm"
                        href={p(`/certificate/${view.certificateCode}`)}
                      >
                        {t.learn.viewCertificate}
                      </ButtonLink>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        ),
        notes: view.access.enrolled ? (
          <NotesPanel
            lessonId={view.lessonSummary.id}
            initialNotes={notes}
            locale={locale}
            labels={{
              placeholder: t.learn.notePlaceholder,
              add: t.learn.addNote,
              empty: t.common.empty,
              delete: t.common.delete,
            }}
          />
        ) : (
          <Alert tone="warn">{t.courses.lockedHint}</Alert>
        ),
        discussion: (
          <CommentsPanel
            courseId={view.course.id}
            lessonId={view.lessonSummary.id}
            initialComments={commentItems}
            currentUser={
              view.access.canView
                ? { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl }
                : null
            }
            locale={locale}
            labels={{
              placeholder: t.learn.commentPlaceholder,
              post: t.learn.postComment,
              empty: t.learn.noComments,
              reply: t.learn.reply,
              like: t.learn.like,
              question: t.learn.askQuestion,
              markAsQuestion: t.learn.askQuestion,
            }}
          />
        ),
        resources: lesson ? (
          <LessonResources lessonId={lesson.id} emptyLabel={t.common.empty} />
        ) : (
          <p className="text-[13px] text-ink-subtle">{t.common.empty}</p>
        ),
      }}
    >
      {/* Lesson body */}
      {!view.unlocked ? (
        <LockedLesson
          courseSlug={view.course.slug}
          labels={{
            locked: t.courses.locked,
            lockedHint: t.courses.lockedHint,
            buyNow: t.courses.buyNow,
          }}
        />
      ) : lesson?.type === "TEXT" && lesson.textContent ? (
        <article
          className="prose-course max-w-prose"
          dangerouslySetInnerHTML={{ __html: paragraphsToHtml(lesson.textContent) }}
        />
      ) : lesson?.type === "QUIZ" && lesson.quiz ? (
        <QuizRunner
          quizId={lesson.quiz.id}
          title={lesson.quiz.title}
          instructions={lesson.quiz.instructions}
          passingScore={lesson.quiz.passingScore}
          maxAttempts={lesson.quiz.maxAttempts}
          attemptsUsed={quizAttempts}
          questions={lesson.quiz.questions}
          labels={{
            start: t.quiz.start,
            retake: t.quiz.retake,
            submitAnswers: t.quiz.submitAnswers,
            yourScore: t.quiz.yourScore,
            passed: t.quiz.passed,
            failed: t.quiz.failed,
            passingScore: t.quiz.passingScore,
            passingScoreShort: t.quiz.passingScore.replace(": {n}%", ""),
            explanation: t.quiz.explanation,
            noAttemptsLeft: t.quiz.noAttemptsLeft,
            attemptsLabel: t.quiz.attemptsLeft.replace("{n}", "").trim(),
            selectAnswer: t.quiz.selectAnswer,
            selectAll: t.quiz.selectAll,
            questionsCount: t.common.total,
            answerAll: t.quiz.selectAnswer,
          }}
        />
      ) : lesson && (lesson.type === "PDF" || lesson.type === "FILE") && lesson.assetKey ? (
        <PdfLesson lessonId={lesson.id} labels={{ open: t.common.open, download: t.common.download }} />
      ) : lesson?.type === "ASSIGNMENT" && lesson.assignment ? (
        <Card className="p-5">
          <h2 className="text-lg">{lesson.assignment.title}</h2>
          <div
            className="prose-course mt-3 max-w-prose"
            dangerouslySetInnerHTML={{ __html: paragraphsToHtml(lesson.assignment.instructions) }}
          />
        </Card>
      ) : lesson?.type === "VIDEO" && !lesson.assetKey ? (
        <Alert tone="warn">
          {locale === "en"
            ? "The instructor has not uploaded a video for this lesson yet."
            : "ინსტრუქტორს ჯერ არ აუტვირთავს ვიდეო ამ გაკვეთილისთვის."}
        </Alert>
      ) : null}
    </LearnShell>
  );
}
