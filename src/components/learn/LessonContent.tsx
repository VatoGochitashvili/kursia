"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { formatBytes } from "@/lib/format";

interface PlaybackPayload {
  documentUrl: string | null;
  resources: {
    id: string;
    title: string;
    url: string;
    sizeBytes: number | null;
    mimeType: string | null;
  }[];
}

/**
 * Fetches per-user media grants for the current lesson. The URLs are
 * short-lived and bound to the signed-in account, so they are requested at
 * view time rather than embedded in the server-rendered HTML.
 */
function usePlayback(lessonId: string) {
  const [data, setData] = useState<PlaybackPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/lessons/${lessonId}/playback`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((payload: PlaybackPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  return { data, loading };
}

/** Inline PDF viewer backed by the protected media route. */
export function PdfLesson({
  lessonId,
  labels,
}: {
  lessonId: string;
  labels: Record<string, string>;
}) {
  const { data, loading } = usePlayback(lessonId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-line bg-surface">
        <Spinner className="h-6 w-6 text-ink-subtle" />
      </div>
    );
  }
  if (!data?.documentUrl) return null;

  return (
    <div className="space-y-3">
      {/* The object element streams through /api/media, so the underlying
          storage path is never exposed to the browser. */}
      <object
        data={data.documentUrl}
        type="application/pdf"
        className="h-[70dvh] w-full rounded-xl border border-line bg-surface"
      >
        <div className="p-6 text-center text-sm text-ink-muted">
          <a
            href={data.documentUrl}
            className="font-semibold text-brand-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {labels.open}
          </a>
        </div>
      </object>

      <a
        href={data.documentUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <Icon name="external" size={14} />
        {labels.open}
      </a>
    </div>
  );
}

/** Downloadable attachments for a lesson. */
export function LessonResources({
  lessonId,
  emptyLabel,
}: {
  lessonId: string;
  emptyLabel: string;
}) {
  const { data, loading } = usePlayback(lessonId);

  if (loading) return <div className="skeleton h-16 rounded-xl" />;
  if (!data || data.resources.length === 0) {
    return <p className="text-[13px] text-ink-subtle">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {data.resources.map((resource) => (
        <li key={resource.id}>
          <Card className="transition-colors hover:border-brand-200">
            <a
              href={resource.url}
              download
              className="flex items-center gap-3 p-3.5"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="file" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {resource.title}
                </span>
                {resource.sizeBytes !== null && (
                  <span className="block text-[11px] text-ink-subtle">
                    {formatBytes(resource.sizeBytes)}
                  </span>
                )}
              </span>
              <Icon name="download" size={16} className="shrink-0 text-ink-subtle" />
            </a>
          </Card>
        </li>
      ))}
    </ul>
  );
}
