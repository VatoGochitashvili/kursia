"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Modal confirmation for destructive actions.
 *
 * `window.confirm` blocks the main thread, cannot be styled, cannot show the
 * consequence in the user's own language beyond one line, and on mobile is
 * easy to dismiss by accident. Anything that deletes work gets this instead.
 *
 * Focus is moved to the cancel button on open — not the destructive one — so
 * a stray Enter keypress cannot destroy anything, and Escape always closes.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = "danger",
  icon = "alert",
  pending,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "brand";
  icon?: IconName;
  pending?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);

    // Stop the page behind the dialog from scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onCancel, pending]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm"
        onClick={() => !pending && onCancel()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-line bg-surface shadow-xl">
        <div className="p-6">
          <span
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
              tone === "danger" ? "bg-danger-50 text-danger-700" : "bg-brand-50 text-brand-600",
            )}
          >
            <Icon name={icon} size={23} />
          </span>

          <h2 id="confirm-title" className="mt-4 text-xl">
            {title}
          </h2>
          <div className="mt-2 text-[14px] leading-relaxed text-ink-muted">{body}</div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted p-4 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
