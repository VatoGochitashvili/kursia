"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { MediaUploader } from "@/components/ui/MediaUploader";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { TimeAgo } from "@/components/ui/TimeAgo";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface Submission {
  id: string;
  body: string | null;
  assetKey: string | null;
  status: string;
  points: number | null;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  user?: { id: string; profile: { fullName: string; avatarUrl: string | null } | null };
}

interface Payload {
  assignment: {
    id: string;
    title: string;
    instructions: string;
    allowFileUpload: boolean;
    maxPoints: number;
  } | null;
  submissions: Submission[];
  mine: Submission | null;
  canReview?: boolean;
}

/**
 * The assignment on a lesson: the brief, plus whichever half of the exchange
 * applies to whoever is reading.
 *
 * Both halves come from one endpoint that branches server-side on who is
 * asking, so this component never has to decide what a student is allowed to
 * see — it renders what it was given. A student receives their own submission
 * and an empty list; a creator receives every submission and no "mine".
 */
export function AssignmentPanel({
  lessonId,
  courseId,
  locale,
  t,
}: {
  lessonId: string;
  courseId: string;
  locale: Locale;
  t: Dictionary;
}) {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<Payload>(`/api/lessons/${lessonId}/assignment`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!data) {
    return (
      <Card className="p-5">
        <div className="skeleton h-5 w-48 rounded" />
        <div className="skeleton mt-3 h-4 w-full rounded" />
        <div className="skeleton mt-2 h-4 w-2/3 rounded" />
      </Card>
    );
  }
  if (!data.assignment) return null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg">{data.assignment.title}</h2>
          <Badge tone="neutral">
            {data.assignment.maxPoints} {t.learn.points}
          </Badge>
        </div>
        <p className="prose-course mt-3 max-w-prose whitespace-pre-line">
          {data.assignment.instructions}
        </p>
      </Card>

      {data.canReview ? (
        <ReviewList
          assignmentId={data.assignment.id}
          maxPoints={data.assignment.maxPoints}
          submissions={data.submissions}
          locale={locale}
          t={t}
          onReviewed={load}
        />
      ) : (
        <SubmitPanel
          assignmentId={data.assignment.id}
          courseId={courseId}
          allowFileUpload={data.assignment.allowFileUpload}
          maxPoints={data.assignment.maxPoints}
          mine={data.mine}
          locale={locale}
          t={t}
          onSubmitted={() => {
            void load();
            toast.show(t.learn.assignmentSent, "success");
          }}
        />
      )}
    </div>
  );
}

/* ── Student ─────────────────────────────────────────────────────────── */

function SubmitPanel({
  assignmentId,
  courseId,
  allowFileUpload,
  maxPoints,
  mine,
  locale,
  t,
  onSubmitted,
}: {
  assignmentId: string;
  courseId: string;
  allowFileUpload: boolean;
  maxPoints: number;
  mine: Submission | null;
  locale: Locale;
  t: Dictionary;
  onSubmitted: () => void;
}) {
  const [body, setBody] = useState(mine?.body ?? "");
  const [assetKey, setAssetKey] = useState<string | null>(mine?.assetKey ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewed = mine?.status === "REVIEWED";

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/assignments/${assignmentId}/submissions`, {
        body: body.trim() || undefined,
        assetKey: assetKey || undefined,
      });
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  // Marked work is read-only: the score and feedback are the point of it, and
  // the server refuses a resubmit anyway.
  if (reviewed) {
    return (
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-success-700">
            <Icon name="check" size={17} />
            {t.learn.assignmentReviewed}
          </span>
          {mine?.points !== null && mine?.points !== undefined && (
            <span className="text-xl font-bold tabular-nums text-ink">
              {mine.points}
              <span className="text-[15px] font-medium text-ink-muted">/{maxPoints}</span>
            </span>
          )}
        </div>

        {mine?.feedback && (
          <div className="mt-4 rounded-xl bg-surface-muted p-4">
            <p className="text-[12px] font-semibold text-ink-muted">{t.learn.feedback}</p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">
              {mine.feedback}
            </p>
          </div>
        )}

        {mine?.body && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[12px] font-semibold text-ink-muted">{t.learn.yourAnswer}</p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-muted">
              {mine.body}
            </p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px]">{t.learn.yourAnswer}</h3>
        {mine && (
          <span className="text-[12px] text-ink-subtle">
            {t.learn.assignmentAwaiting} · <TimeAgo date={mine.submittedAt} locale={locale} />
          </span>
        )}
      </div>

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}

      <Field className="mt-3">
        <Textarea
          rows={6}
          value={body}
          placeholder={t.learn.assignmentPlaceholder}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>

      {allowFileUpload && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-semibold text-ink-muted">{t.learn.attachFile}</p>
          {assetKey ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted p-2.5">
              <Icon name="file" size={17} className="text-brand-600" />
              <span className="flex-1 truncate text-[13px] text-ink">{t.learn.fileAttached}</span>
              <button
                type="button"
                onClick={() => setAssetKey(null)}
                className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-danger-50 hover:text-danger-700"
                aria-label={t.common.remove}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <MediaUploader
              kind="submission"
              courseId={courseId}
              preview="file"
              value={null}
              onUploaded={(result) => setAssetKey(result.key)}
              labels={{
                drop: t.upload.dropFile,
                browse: t.upload.browse,
                uploading: t.upload.uploading,
                replace: t.upload.replace,
                remove: t.upload.remove,
                cancel: t.upload.cancel,
                tooLarge: t.upload.tooLarge,
                wrongType: t.upload.wrongType,
              }}
              icon="upload"
              compact
            />
          )}
        </div>
      )}

      <Button
        className="mt-4"
        loading={pending}
        disabled={!body.trim() && !assetKey}
        onClick={submit}
      >
        <Icon name="send" size={16} />
        {mine ? t.learn.assignmentResend : t.learn.assignmentSend}
      </Button>
    </Card>
  );
}

/* ── Creator ─────────────────────────────────────────────────────────── */

function ReviewList({
  assignmentId,
  maxPoints,
  submissions,
  locale,
  t,
  onReviewed,
}: {
  assignmentId: string;
  maxPoints: number;
  submissions: Submission[];
  locale: Locale;
  t: Dictionary;
  onReviewed: () => void;
}) {
  if (submissions.length === 0) {
    return (
      <Card className="p-5 text-center">
        <p className="text-[14px] text-ink-muted">{t.learn.noSubmissions}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <ReviewRow
          key={submission.id}
          assignmentId={assignmentId}
          maxPoints={maxPoints}
          submission={submission}
          locale={locale}
          t={t}
          onReviewed={onReviewed}
        />
      ))}
    </div>
  );
}

function ReviewRow({
  assignmentId,
  maxPoints,
  submission,
  locale,
  t,
  onReviewed,
}: {
  assignmentId: string;
  maxPoints: number;
  submission: Submission;
  locale: Locale;
  t: Dictionary;
  onReviewed: () => void;
}) {
  const toast = useToast();
  const [points, setPoints] = useState(String(submission.points ?? ""));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = submission.status === "REVIEWED";

  async function review() {
    setPending(true);
    setError(null);
    try {
      await api.patch(`/api/assignments/${assignmentId}/submissions`, {
        submissionId: submission.id,
        points: points === "" ? undefined : Number(points),
        feedback: feedback.trim() || undefined,
      });
      toast.show(t.learn.assignmentMarked, "success");
      onReviewed();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar
          src={submission.user?.profile?.avatarUrl ?? null}
          name={submission.user?.profile?.fullName ?? "?"}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            {submission.user?.profile?.fullName ?? "—"}
          </p>
          <p className="text-[12px] text-ink-subtle">
            <TimeAgo date={submission.submittedAt} locale={locale} />
          </p>
        </div>
        <Badge tone={done ? "success" : "warn"}>
          {done ? t.learn.assignmentReviewed : t.learn.assignmentAwaiting}
        </Badge>
      </div>

      {submission.body && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted p-3 text-[14px] leading-relaxed text-ink">
          {submission.body}
        </p>
      )}

      {submission.assetKey && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
          <Icon name="file" size={14} />
          {t.learn.fileAttached}
        </p>
      )}

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label={`${t.learn.points} / ${maxPoints}`} className="w-28">
          <Input
            type="number"
            min={0}
            max={maxPoints}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </Field>
        <Field label={t.learn.feedback} className="min-w-[12rem] flex-1">
          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </Field>
        <Button size="md" loading={pending} onClick={review}>
          {done ? t.common.save : t.learn.assignmentMark}
        </Button>
      </div>
    </Card>
  );
}
