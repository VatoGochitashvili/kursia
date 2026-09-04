"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export interface QuizQuestionView {
  id: string;
  prompt: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | string;
  points: number;
  answers: { id: string; text: string }[];
}

interface AttemptResult {
  scorePercent: number;
  isPassed: boolean;
  passingScore: number;
  pointsEarned: number;
  pointsTotal: number;
  attemptsUsed: number;
  maxAttempts: number;
  results: {
    questionId: string;
    isCorrect: boolean;
    explanation: string | null;
    chosenIds: string[];
    correctIds: string[];
  }[];
}

/**
 * Quiz runner.
 *
 * The component only ever knows question text and answer *labels* — which
 * answer is correct is not in the payload. It submits chosen ids and renders
 * whatever the server grades, so a score cannot be forged client-side.
 */
export function QuizRunner({
  quizId,
  title,
  instructions,
  passingScore,
  maxAttempts,
  attemptsUsed,
  questions,
  labels,
}: {
  quizId: string;
  title: string;
  instructions: string | null;
  passingScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  questions: QuizQuestionView[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const attemptsLeft = maxAttempts > 0 ? Math.max(maxAttempts - attemptsUsed, 0) : null;
  const exhausted = attemptsLeft === 0;

  function toggle(question: QuizQuestionView, answerId: string) {
    setChoices((prev) => {
      const current = prev[question.id] ?? [];
      if (question.type === "MULTIPLE_CHOICE") {
        return {
          ...prev,
          [question.id]: current.includes(answerId)
            ? current.filter((id) => id !== answerId)
            : [...current, answerId],
        };
      }
      return { ...prev, [question.id]: [answerId] };
    });
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const data = await api.post<AttemptResult>(`/api/quizzes/${quizId}/attempts`, {
        answers: questions.map((q) => ({ questionId: q.id, answerIds: choices[q.id] ?? [] })),
      });
      setResult(data);
      setStarted(false);
      // Passing marks the lesson complete server-side — refresh the shell so
      // the sidebar and progress bar reflect it.
      if (data.isPassed) router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  const answeredAll = questions.every((q) => (choices[q.id] ?? []).length > 0);

  // ── Result view ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-5">
        <Card
          className={cn(
            "p-6 text-center",
            result.isPassed ? "border-success-500/30 bg-success-50" : "border-warn-500/30 bg-warn-50",
          )}
        >
          <span
            className={cn(
              "mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white",
              result.isPassed ? "bg-success-500" : "bg-warn-500",
            )}
          >
            <Icon name={result.isPassed ? "check" : "alert"} size={26} />
          </span>
          <p className="mt-4 text-[13px] font-semibold text-ink-muted">{labels.yourScore}</p>
          <p className="text-4xl font-bold tabular-nums text-ink">{result.scorePercent}%</p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              result.isPassed ? "text-success-700" : "text-warn-700",
            )}
          >
            {result.isPassed ? labels.passed : labels.failed}
          </p>
          <p className="mt-1 text-[12px] text-ink-subtle">
            {result.pointsEarned}/{result.pointsTotal} ·{" "}
            {labels.passingScore.replace("{n}", String(result.passingScore))}
          </p>

          {!result.isPassed &&
            (result.maxAttempts === 0 || result.attemptsUsed < result.maxAttempts) && (
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setChoices({});
                  setStarted(true);
                }}
              >
                {labels.retake}
              </Button>
            )}
        </Card>

        <ul className="space-y-3">
          {questions.map((question, index) => {
            const outcome = result.results.find((r) => r.questionId === question.id);
            if (!outcome) return null;
            return (
              <li key={question.id}>
                <Card className="p-4">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white",
                        outcome.isCorrect ? "bg-success-500" : "bg-danger-500",
                      )}
                    >
                      <Icon name={outcome.isCorrect ? "check" : "close"} size={12} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">
                        {index + 1}. {question.prompt}
                      </p>
                      <ul className="mt-2.5 space-y-1.5">
                        {question.answers.map((answer) => {
                          const isCorrect = outcome.correctIds.includes(answer.id);
                          const wasChosen = outcome.chosenIds.includes(answer.id);
                          return (
                            <li
                              key={answer.id}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px]",
                                isCorrect
                                  ? "bg-success-50 font-medium text-success-700"
                                  : wasChosen
                                    ? "bg-danger-50 text-danger-700"
                                    : "text-ink-muted",
                              )}
                            >
                              {isCorrect && <Icon name="check" size={13} className="shrink-0" />}
                              {!isCorrect && wasChosen && (
                                <Icon name="close" size={13} className="shrink-0" />
                              )}
                              {answer.text}
                            </li>
                          );
                        })}
                      </ul>
                      {outcome.explanation && (
                        <p className="mt-2.5 rounded-lg bg-brand-50 px-3 py-2 text-[12px] leading-relaxed text-brand-900">
                          <span className="font-semibold">{labels.explanation}: </span>
                          {outcome.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Intro view ───────────────────────────────────────────────────────────
  if (!started) {
    return (
      <Card className="p-6">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="check" size={21} />
        </span>
        <h2 className="mt-3.5 text-xl">{title}</h2>
        {instructions && (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{instructions}</p>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <div>
            <dt className="text-ink-subtle">{labels.questionsCount}</dt>
            <dd className="font-bold tabular-nums text-ink">{questions.length}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">{labels.passingScoreShort}</dt>
            <dd className="font-bold tabular-nums text-ink">{passingScore}%</dd>
          </div>
          {attemptsLeft !== null && (
            <div>
              <dt className="text-ink-subtle">{labels.attemptsLabel}</dt>
              <dd className="font-bold tabular-nums text-ink">{attemptsLeft}</dd>
            </div>
          )}
        </dl>

        {exhausted ? (
          <Alert tone="warn" className="mt-5">
            {labels.noAttemptsLeft}
          </Alert>
        ) : (
          <Button className="mt-5" size="lg" onClick={() => setStarted(true)}>
            {attemptsUsed > 0 ? labels.retake : labels.start}
          </Button>
        )}
      </Card>
    );
  }

  // ── Question view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      {questions.map((question, index) => {
        const selected = choices[question.id] ?? [];
        const multi = question.type === "MULTIPLE_CHOICE";
        return (
          <Card key={question.id} className="p-5">
            <p className="text-sm font-semibold text-ink">
              {index + 1}. {question.prompt}
            </p>
            <p className="mt-1 text-[12px] text-ink-subtle">
              {multi ? labels.selectAll : labels.selectAnswer}
            </p>
            <ul className="mt-3 space-y-2">
              {question.answers.map((answer) => {
                const isSelected = selected.includes(answer.id);
                return (
                  <li key={answer.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] transition-colors",
                        isSelected
                          ? "border-brand-500 bg-brand-50 font-medium text-brand-800"
                          : "border-line-strong text-ink-muted hover:border-brand-200 hover:bg-surface-muted",
                      )}
                    >
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name={question.id}
                        checked={isSelected}
                        onChange={() => toggle(question, answer.id)}
                        className={cn(
                          "h-4 w-4 shrink-0 border-line-strong text-brand-600 focus:ring-brand-500/30",
                          multi ? "rounded" : "rounded-full",
                        )}
                      />
                      {answer.text}
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" loading={pending} disabled={!answeredAll} onClick={submit}>
          {labels.submitAnswers}
        </Button>
        {!answeredAll && <p className="text-[13px] text-ink-subtle">{labels.answerAll}</p>}
      </div>
    </div>
  );
}
