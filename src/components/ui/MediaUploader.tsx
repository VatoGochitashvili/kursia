"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * Drag-and-drop file upload with a live preview and real progress.
 *
 * One component backs avatars, course thumbnails and lesson media, because
 * the three differ only in accepted types and how the result is previewed —
 * duplicating the drag state, the abort handling and the error envelope three
 * times is how they drift apart.
 *
 * The size and extension checks here are a courtesy, not a control: they turn
 * a 3GB mistake into an instant message instead of a five-minute upload that
 * ends in a rejection. The server re-validates everything (see
 * `validateUpload`) and remains the only thing that decides what is stored.
 */

export interface UploadResult {
  key: string;
  size: number;
  mimeType: string;
  url: string | null;
}

export type UploadKind = "avatar" | "thumbnail" | "video" | "pdf" | "captions" | "resource";

/** Mirrors UPLOAD_KINDS in src/lib/storage — kept in sync for pre-flight only. */
const CLIENT_LIMITS: Record<UploadKind, { maxBytes: number; accept: string; extensions: string[] }> = {
  avatar: {
    maxBytes: 4 * 1024 * 1024,
    accept: "image/jpeg,image/png,image/webp,image/avif",
    extensions: ["jpg", "jpeg", "png", "webp", "avif"],
  },
  thumbnail: {
    maxBytes: 8 * 1024 * 1024,
    accept: "image/jpeg,image/png,image/webp,image/avif",
    extensions: ["jpg", "jpeg", "png", "webp", "avif"],
  },
  video: {
    maxBytes: 3000 * 1024 * 1024,
    accept: "video/mp4,video/webm,video/quicktime,video/x-m4v",
    extensions: ["mp4", "webm", "mov", "m4v"],
  },
  pdf: { maxBytes: 100 * 1024 * 1024, accept: "application/pdf", extensions: ["pdf"] },
  captions: { maxBytes: 2 * 1024 * 1024, accept: ".vtt,.srt", extensions: ["vtt", "srt"] },
  resource: {
    maxBytes: 200 * 1024 * 1024,
    accept: ".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg",
    extensions: ["pdf", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "png", "jpg", "jpeg"],
  },
};

export interface UploaderLabels {
  drop: string;
  browse: string;
  uploading: string;
  replace: string;
  remove: string;
  hint?: string;
  tooLarge: string;
  wrongType: string;
  cancel: string;
}

interface Props {
  kind: UploadKind;
  courseId?: string;
  lessonId?: string;
  /** Current value: a URL for images, or a display name for opaque files. */
  value?: string | null;
  /** What the current value looks like once uploaded. */
  preview?: "image" | "video" | "file";
  /** Shown beside a "file" preview instead of the raw key. */
  valueLabel?: string | null;
  onUploaded: (result: UploadResult) => void;
  onRemove?: () => void;
  labels: UploaderLabels;
  icon?: IconName;
  className?: string;
  /** Compact layout for tight rows (lesson editor). */
  compact?: boolean;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MediaUploader({
  kind,
  courseId,
  lessonId,
  value,
  preview = "image",
  valueLabel,
  onUploaded,
  onRemove,
  labels,
  icon = "upload",
  className,
  compact,
  disabled,
}: Props) {
  const limits = CLIENT_LIMITS[kind];
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // An upload left running after the component unmounts would resolve into a
  // setState on a dead component and keep the connection open for nothing.
  useEffect(() => () => abortRef.current?.(), []);

  const start = useCallback(
    (file: File) => {
      setError(null);

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!limits.extensions.includes(extension)) {
        setError(labels.wrongType);
        return;
      }
      if (file.size > limits.maxBytes) {
        setError(`${labels.tooLarge} (${formatBytes(limits.maxBytes)})`);
        return;
      }

      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      if (courseId) form.set("courseId", courseId);
      if (lessonId) form.set("lessonId", lessonId);

      setProgress(0);
      const { promise, abort } = api.uploadWithProgress<UploadResult>(
        "/api/uploads",
        form,
        setProgress,
      );
      abortRef.current = abort;

      promise
        .then((result) => onUploaded(result))
        .catch((err) => {
          // A deliberate cancel is not an error worth shouting about.
          if (err instanceof Error && err.message.includes("გაუქმდა")) return;
          setError(errorMessage(err));
        })
        .finally(() => {
          setProgress(null);
          abortRef.current = null;
        });
    },
    [courseId, kind, labels.tooLarge, labels.wrongType, lessonId, limits, onUploaded],
  );

  const uploading = progress !== null;

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) start(file);
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
          dragging
            ? "border-brand-400 bg-brand-50/70 scale-[1.01]"
            : "border-line-strong bg-surface-muted/50 hover:border-brand-300 hover:bg-brand-50/30",
          disabled && "pointer-events-none opacity-60",
          compact ? "p-3" : "p-5",
        )}
      >
        {/* Existing value ------------------------------------------------ */}
        {value && !uploading && (
          <div className={cn("flex items-center gap-4", compact && "gap-3")}>
            {preview === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- the key
              // can live on any configured storage host, which next/image
              // would need allow-listed at build time.
              <img
                src={value}
                alt=""
                className={cn(
                  "shrink-0 rounded-xl object-cover ring-1 ring-line",
                  compact ? "h-12 w-20" : "h-20 w-32",
                )}
              />
            ) : (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600",
                  compact ? "h-12 w-12" : "h-16 w-16",
                )}
              >
                <Icon name={preview === "video" ? "video" : "file"} size={compact ? 20 : 26} />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">
                {valueLabel ?? value.split("/").pop()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink transition-all duration-200 hover:border-brand-300 hover:text-brand-700 active:scale-[0.97]"
                >
                  <Icon name="refresh" size={13} />
                  {labels.replace}
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold text-danger-700 transition-all duration-200 hover:border-danger-500/40 hover:bg-danger-50 active:scale-[0.97]"
                  >
                    <Icon name="trash" size={13} />
                    {labels.remove}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state --------------------------------------------------- */}
        {!value && !uploading && (
          <label
            htmlFor={inputId}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center text-center",
              compact ? "gap-1.5 py-2" : "gap-2 py-6",
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-transform duration-300",
                dragging ? "scale-110" : "group-hover:scale-105",
                compact ? "h-9 w-9" : "h-12 w-12",
              )}
            >
              <Icon name={icon} size={compact ? 17 : 22} />
            </span>
            <span className={cn("font-semibold text-ink", compact ? "text-[12px]" : "text-[14px]")}>
              {labels.drop}
            </span>
            <span className="text-[12px] font-semibold text-brand-600 underline underline-offset-2">
              {labels.browse}
            </span>
            {labels.hint && !compact && (
              <span className="text-[11px] text-ink-subtle">{labels.hint}</span>
            )}
          </label>
        )}

        {/* Uploading ----------------------------------------------------- */}
        {uploading && (
          <div className={cn("flex flex-col", compact ? "gap-2 py-1" : "gap-3 py-3")}>
            <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
              <Spinner className="h-4 w-4 text-brand-600" />
              {labels.uploading}
              <span className="ms-auto tabular-nums text-ink-muted">{progress}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-sunken"
              role="progressbar"
              aria-valuenow={progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => abortRef.current?.()}
              className="self-start text-[12px] font-semibold text-ink-muted underline underline-offset-2 hover:text-danger-700"
            >
              {labels.cancel}
            </button>
          </div>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={limits.accept}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so choosing the same file twice still fires onChange.
            e.target.value = "";
            if (file) start(file);
          }}
        />
      </div>

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-danger-700">
          <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
