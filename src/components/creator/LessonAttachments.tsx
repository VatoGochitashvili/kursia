"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { MediaUploader } from "@/components/ui/MediaUploader";
import { Alert, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/format";
import type { Dictionary } from "@/i18n";

interface Attachment {
  id: string;
  title: string;
  sizeBytes: number | null;
  mimeType: string | null;
}

/**
 * Downloadable files attached to one lesson — a workout plan PDF, a meal
 * template, a project file.
 *
 * The list is fetched rather than passed down with the lesson, because it
 * changes on its own schedule: uploading or removing a file has nothing to do
 * with the rest of the lesson form, and threading it through would mean the
 * whole curriculum reloads every time somebody drops in a PDF.
 *
 * Attachments are offered on every lesson type. A quiz or a text lesson can
 * just as reasonably carry a worksheet as a video can.
 */
export function LessonAttachments({
  courseId,
  lessonId,
  t,
}: {
  courseId: string;
  lessonId: string;
  t: Dictionary;
}) {
  const toast = useToast();
  const [items, setItems] = useState<Attachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ resources: Attachment[] }>(
        `/api/lessons/${lessonId}/resources`,
      );
      setItems(result.resources);
    } catch (err) {
      setError(errorMessage(err));
      setItems([]);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rename(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await api.patch(`/api/lessons/${lessonId}/resources`, { resourceId: id, title: trimmed });
    } catch (err) {
      setError(errorMessage(err));
      void load(); // Put the old name back rather than leave a lie on screen.
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.delete(`/api/lessons/${lessonId}/resources?resourceId=${encodeURIComponent(id)}`);
      setItems((current) => (current ?? []).filter((item) => item.id !== id));
      toast.show(t.creator.attachmentRemoved, "success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-[13px] font-semibold text-ink">{t.creator.attachments}</p>
      <p className="mb-2.5 text-[12px] text-ink-muted">{t.creator.attachmentsHint}</p>

      {error && (
        <Alert tone="danger" className="mb-2.5">
          {error}
        </Alert>
      )}

      {items && items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex animate-fade-in items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="file" size={17} />
              </span>

              <span className="min-w-0 flex-1">
                <Input
                  defaultValue={item.title}
                  aria-label={t.creator.attachmentName}
                  className="h-9 text-[13px]"
                  onBlur={(e) => void rename(item.id, e.target.value)}
                />
              </span>

              {item.sizeBytes !== null && (
                <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">
                  {formatBytes(item.sizeBytes)}
                </span>
              )}

              <button
                type="button"
                onClick={() => void remove(item.id)}
                disabled={busyId === item.id}
                aria-label={t.common.delete}
                className="shrink-0 rounded-lg p-2 text-ink-subtle transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-50"
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <MediaUploader
        kind="resource"
        courseId={courseId}
        lessonId={lessonId}
        preview="file"
        // The list above is the record of what exists; the uploader stays in
        // its drop-zone state so another file can always be added.
        value={null}
        onUploaded={() => {
          void load();
          toast.show(t.creator.attachmentAdded, "success");
        }}
        labels={{
          drop: t.upload.dropFile,
          browse: t.upload.browse,
          uploading: t.upload.uploading,
          replace: t.upload.replace,
          remove: t.upload.remove,
          cancel: t.upload.cancel,
          tooLarge: t.upload.tooLarge,
          wrongType: t.upload.wrongType,
          hint: t.creator.attachmentTypes,
        }}
        icon="download"
        compact
      />
    </div>
  );
}
