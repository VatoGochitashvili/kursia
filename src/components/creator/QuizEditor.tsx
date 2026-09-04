"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button, Spinner } from "@/components/ui/Button";
import { Alert, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface EditableAnswer {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface EditableQuestion {
  id?: string;
  prompt: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  explanation: string;
  points: number;
  answers: EditableAnswer[];
}

const blankQuestion = (locale: Locale): EditableQuestion => ({
  prompt: "",
  type: "SINGLE_CHOICE",
  explanation: "",
  points: 1,
  answers: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
});

/**
 * Quiz editor — a modal over the curriculum.
 *
 * The whole question set is saved in one PUT, which the server rebuilds
 * transactionally. Correct answers live here (owner-only) and are never
 * included in the payload students receive.
 */
export function QuizEditor({
  lessonId,
  locale,
  t,
  onClose,
}: {
  lessonId: string;
  locale: Locale;
  t: Dictionary;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState(t.quiz.title);
  const [instructions, setInstructions] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{
        quiz: {
          title: string;
          instructions: string | null;
          passingScore: number;
          maxAttempts: number;
          questions: {
            id: string;
            prompt: string;
            type: string;
            explanation: string | null;
            points: number;
            answers: { id: string; text: string; isCorrect: boolean }[];
          }[];
        } | null;
      }>(`/api/lessons/${lessonId}/quiz`)
      .then((data) => {
        if (cancelled) return;
        if (data.quiz) {
          setTitle(data.quiz.title);
          setInstructions(data.quiz.instructions ?? "");
          setPassingScore(data.quiz.passingScore);
          setMaxAttempts(data.quiz.maxAttempts);
          setQuestions(
            data.quiz.questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              type: q.type as EditableQuestion["type"],
              explanation: q.explanation ?? "",
              points: q.points,
              answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
            })),
          );
        } else {
          setQuestions([blankQuestion(locale)]);
        }
      })
      .catch(() => setQuestions([blankQuestion(locale)]))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, locale]);

  // Escape closes the modal, like every other dialog on the platform.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function updateQuestion(index: number, patch: Partial<EditableQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const next = { ...q, ...patch };
        // Switching to true/false replaces the answer set with the two
        // canonical options, keeping which one was marked correct.
        if (patch.type === "TRUE_FALSE") {
          const correctIndex = q.answers.findIndex((a) => a.isCorrect);
          next.answers = [
            { text: t.quiz.true, isCorrect: correctIndex !== 1 },
            { text: t.quiz.false, isCorrect: correctIndex === 1 },
          ];
        }
        // Leaving multi-answer keeps only the first correct option.
        if (patch.type && patch.type !== "MULTIPLE_CHOICE") {
          let seen = false;
          next.answers = next.answers.map((a) => {
            if (a.isCorrect && !seen) {
              seen = true;
              return a;
            }
            return { ...a, isCorrect: false };
          });
        }
        return next;
      }),
    );
    setSaved(false);
  }

  function toggleCorrect(questionIndex: number, answerIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        return {
          ...q,
          answers: q.answers.map((a, ai) =>
            q.type === "MULTIPLE_CHOICE"
              ? ai === answerIndex
                ? { ...a, isCorrect: !a.isCorrect }
                : a
              : { ...a, isCorrect: ai === answerIndex },
          ),
        };
      }),
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/lessons/${lessonId}/quiz`, {
        title,
        instructions: instructions || undefined,
        passingScore,
        maxAttempts,
        shuffleQuestions: false,
        questions: questions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          explanation: q.explanation || undefined,
          points: q.points,
          answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        })),
      });
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.quiz.title}
        className="relative flex max-h-[92dvh] w-full max-w-3xl animate-fade-up flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-lg font-bold">{t.quiz.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner className="h-6 w-6 text-ink-subtle" />
            </div>
          ) : (
            <div className="space-y-5">
              {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
              {saved && <Alert tone="success">{t.common.saved}</Alert>}

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t.creator.lessonTitle} className="sm:col-span-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} />
                </Field>
                <Field
                  label={locale === "en" ? "Passing score (%)" : "გამსვლელი ქულა (%)"}
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                  />
                </Field>
                <Field
                  label={locale === "en" ? "Max attempts" : "მაქს. ცდები"}
                  hint={locale === "en" ? "0 = unlimited" : "0 = შეუზღუდავი"}
                >
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  />
                </Field>
                <Field label={t.quiz.title} className="sm:col-span-3">
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    maxLength={4000}
                  />
                </Field>
              </div>

              <ul className="space-y-4">
                {questions.map((question, qIndex) => (
                  <li key={qIndex} className="rounded-2xl border border-line p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="text-[13px] font-bold text-ink">
                        {locale === "en" ? "Question" : "შეკითხვა"} {qIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-danger-700 hover:underline"
                      >
                        <Icon name="trash" size={13} />
                        {t.common.delete}
                      </button>
                    </div>

                    <Textarea
                      value={question.prompt}
                      onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                      placeholder={locale === "en" ? "Question text" : "შეკითხვის ტექსტი"}
                      rows={2}
                      maxLength={1000}
                    />

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label={t.creator.lessonType}>
                        <Select
                          value={question.type}
                          onChange={(e) =>
                            updateQuestion(qIndex, {
                              type: e.target.value as EditableQuestion["type"],
                            })
                          }
                        >
                          <option value="SINGLE_CHOICE">
                            {locale === "en" ? "Single choice" : "ერთი პასუხი"}
                          </option>
                          <option value="MULTIPLE_CHOICE">
                            {locale === "en" ? "Multiple answers" : "რამდენიმე პასუხი"}
                          </option>
                          <option value="TRUE_FALSE">
                            {locale === "en" ? "True / False" : "სწორი / მცდარი"}
                          </option>
                        </Select>
                      </Field>
                      <Field label={locale === "en" ? "Points" : "ქულა"}>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={question.points}
                          onChange={(e) =>
                            updateQuestion(qIndex, { points: Number(e.target.value) })
                          }
                        />
                      </Field>
                    </div>

                    <p className="mb-2 mt-4 text-[12px] font-semibold text-ink">
                      {question.type === "MULTIPLE_CHOICE" ? t.quiz.selectAll : t.quiz.selectAnswer}
                    </p>

                    <ul className="space-y-2">
                      {question.answers.map((answer, aIndex) => (
                        <li key={aIndex} className="flex items-center gap-2">
                          <input
                            type={question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                            name={`q-${qIndex}`}
                            checked={answer.isCorrect}
                            onChange={() => toggleCorrect(qIndex, aIndex)}
                            aria-label={t.quiz.correct}
                            className="h-4 w-4 shrink-0 border-line-strong text-success-500 focus:ring-success-500/30"
                          />
                          <Input
                            value={answer.text}
                            onChange={(e) =>
                              updateQuestion(qIndex, {
                                answers: question.answers.map((a, i) =>
                                  i === aIndex ? { ...a, text: e.target.value } : a,
                                ),
                              })
                            }
                            disabled={question.type === "TRUE_FALSE"}
                            maxLength={500}
                            className="h-10"
                          />
                          {question.type !== "TRUE_FALSE" && question.answers.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestion(qIndex, {
                                  answers: question.answers.filter((_, i) => i !== aIndex),
                                })
                              }
                              aria-label={t.common.remove}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-subtle hover:bg-danger-50 hover:text-danger-700"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {question.type !== "TRUE_FALSE" && question.answers.length < 10 && (
                      <Button
                        className="mt-2"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateQuestion(qIndex, {
                            answers: [...question.answers, { text: "", isCorrect: false }],
                          })
                        }
                      >
                        <Icon name="plus" size={14} />
                        {t.common.add}
                      </Button>
                    )}

                    <Field className="mt-3" label={t.quiz.explanation}>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                        rows={2}
                        maxLength={2000}
                      />
                    </Field>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                onClick={() => setQuestions((prev) => [...prev, blankQuestion(locale)])}
              >
                <Icon name="plus" size={15} />
                {locale === "en" ? "Add question" : "შეკითხვის დამატება"}
              </Button>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button variant="ghost" onClick={onClose}>
            {t.common.close}
          </Button>
          <Button loading={saving} onClick={save} disabled={questions.length === 0}>
            {t.common.save}
          </Button>
        </footer>
      </div>
    </div>
  );
}
