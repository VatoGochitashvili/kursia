"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/** A creator's public reply to one review. */
export function ReviewReplyForm({
  reviewId,
  existingReply,
  labels,
}: {
  reviewId: string;
  existingReply: string | null;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(existingReply ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/reviews/${reviewId}/reply`, { body: body.trim() });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return existingReply ? (
      <div className="rounded-xl border-l-3 border-brand-300 bg-brand-50/60 px-3.5 py-2.5">
        <p className="text-[12px] font-semibold text-brand-700">{labels.yourReply}</p>
        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
          {existingReply}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline"
        >
          <Icon name="edit" size={12} />
          {labels.edit}
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <Icon name="message" size={14} />
        {labels.reply}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={labels.placeholder}
        rows={3}
        maxLength={2000}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" loading={pending} disabled={!body.trim()} onClick={save}>
          {labels.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
