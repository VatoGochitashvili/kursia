"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Card, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatTimecode, relativeTime } from "@/lib/format";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

// ── Notes ──────────────────────────────────────────────────────────────────

export interface NoteItem {
  id: string;
  body: string;
  positionSeconds: number | null;
  createdAt: string | Date;
}

/**
 * Private per-student lesson notes. Kept optimistic so jotting a thought never
 * waits on the network, with a rollback if the write fails.
 */
export function NotesPanel({
  lessonId,
  initialNotes,
  locale,
  labels,
}: {
  lessonId: string;
  initialNotes: NoteItem[];
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function add() {
    const text = body.trim();
    if (!text) return;
    setPending(true);
    setError(null);
    try {
      const note = await api.post<NoteItem>("/api/notes", { lessonId, body: text });
      setNotes((prev) => [note, ...prev]);
      setBody("");
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    const snapshot = notes;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/api/notes?id=${encodeURIComponent(id)}`);
    } catch {
      setNotes(snapshot);
    }
  }

  return (
    <div className="space-y-4">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={labels.placeholder}
          rows={3}
          maxLength={5000}
        />
        <Button
          className="mt-2"
          size="sm"
          loading={pending}
          disabled={!body.trim()}
          onClick={add}
        >
          <Icon name="plus" size={14} />
          {labels.add}
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-[13px] text-ink-subtle">{labels.empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note) => (
            <li key={note.id}>
              <Card className="group/note p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 whitespace-pre-line text-[13px] leading-relaxed text-ink">
                    {note.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    aria-label={labels.delete}
                    className="shrink-0 rounded-md p-1 text-ink-subtle opacity-0 transition-opacity hover:bg-danger-50 hover:text-danger-700 focus:opacity-100 group-hover/note:opacity-100"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <p className="mt-2 flex items-center gap-2 text-[11px] text-ink-subtle">
                  {note.positionSeconds !== null && (
                    <span className="tabular-nums">{formatTimecode(note.positionSeconds)}</span>
                  )}
                  <span>{relativeTime(note.createdAt, locale)}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Discussion ─────────────────────────────────────────────────────────────

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string | Date;
  isQuestion: boolean;
  likeCount: number;
  likedByMe: boolean;
  user: { id: string; fullName: string; avatarUrl: string | null };
  replies: Omit<CommentItem, "replies">[];
}

export function CommentsPanel({
  courseId,
  lessonId,
  initialComments,
  currentUser,
  locale,
  labels,
}: {
  courseId: string;
  lessonId: string;
  initialComments: CommentItem[];
  currentUser: { id: string; fullName: string; avatarUrl: string | null } | null;
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function post() {
    const text = body.trim();
    if (!text || !currentUser) return;
    setPending(true);
    setError(null);
    try {
      const created = await api.post<{ id: string; body: string; createdAt: string }>(
        "/api/comments",
        { courseId, lessonId, body: text, isQuestion },
      );
      setComments((prev) => [
        {
          id: created.id,
          body: created.body,
          createdAt: created.createdAt,
          isQuestion,
          likeCount: 0,
          likedByMe: false,
          user: currentUser,
          replies: [],
        },
        ...prev,
      ]);
      setBody("");
      setIsQuestion(false);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  async function postReply(parentId: string) {
    const text = replyBody.trim();
    if (!text || !currentUser) return;
    setPending(true);
    try {
      const created = await api.post<{ id: string; body: string; createdAt: string }>(
        "/api/comments",
        { courseId, lessonId, parentId, body: text },
      );
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: [
                  ...c.replies,
                  {
                    id: created.id,
                    body: created.body,
                    createdAt: created.createdAt,
                    isQuestion: false,
                    likeCount: 0,
                    likedByMe: false,
                    user: currentUser,
                  },
                ],
              }
            : c,
        ),
      );
      setReplyBody("");
      setReplyTo(null);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  async function toggleLike(id: string) {
    // Optimistic; the server is the source of truth on refresh.
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) }
          : c,
      ),
    );
    await api.post(`/api/comments/${id}/like`).catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      {currentUser && (
        <div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={labels.placeholder}
            rows={3}
            maxLength={5000}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button size="sm" loading={pending} disabled={!body.trim()} onClick={post}>
              <Icon name="send" size={14} />
              {labels.post}
            </Button>
            <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-ink-muted">
              <input
                type="checkbox"
                checked={isQuestion}
                onChange={(e) => setIsQuestion(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-line-strong text-brand-600 focus:ring-brand-500/30"
              />
              {labels.markAsQuestion}
            </label>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-[13px] text-ink-subtle">{labels.empty}</p>
      ) : (
        <ul className="space-y-5">
          {comments.map((comment) => (
            <li key={comment.id}>
              <div className="flex items-start gap-3">
                <Avatar src={comment.user.avatarUrl} name={comment.user.fullName} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">
                      {comment.user.fullName}
                    </span>
                    {comment.isQuestion && (
                      <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                        {labels.question}
                      </span>
                    )}
                    <span className="text-[11px] text-ink-subtle">
                      {relativeTime(comment.createdAt, locale)}
                    </span>
                  </div>

                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                    {comment.body}
                  </p>

                  <div className="mt-2 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => toggleLike(comment.id)}
                      disabled={!currentUser}
                      className={cn(
                        "inline-flex items-center gap-1 text-[12px] font-medium transition-colors",
                        comment.likedByMe
                          ? "text-accent-600"
                          : "text-ink-subtle hover:text-ink-muted",
                      )}
                    >
                      <Icon name="heart" size={13} filled={comment.likedByMe} />
                      {comment.likeCount > 0 ? comment.likeCount : labels.like}
                    </button>

                    {currentUser && (
                      <button
                        type="button"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        className="text-[12px] font-medium text-ink-subtle transition-colors hover:text-ink-muted"
                      >
                        {labels.reply}
                      </button>
                    )}
                  </div>

                  {replyTo === comment.id && (
                    <div className="mt-3">
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={labels.placeholder}
                        rows={2}
                        maxLength={5000}
                      />
                      <Button
                        className="mt-2"
                        size="sm"
                        loading={pending}
                        disabled={!replyBody.trim()}
                        onClick={() => postReply(comment.id)}
                      >
                        {labels.post}
                      </Button>
                    </div>
                  )}

                  {comment.replies.length > 0 && (
                    <ul className="mt-4 space-y-4 border-s border-line ps-4">
                      {comment.replies.map((reply) => (
                        <li key={reply.id} className="flex items-start gap-2.5">
                          <Avatar
                            src={reply.user.avatarUrl}
                            name={reply.user.fullName}
                            size={28}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[13px] font-semibold text-ink">
                                {reply.user.fullName}
                              </span>
                              <span className="text-[11px] text-ink-subtle">
                                {relativeTime(reply.createdAt, locale)}
                              </span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                              {reply.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
