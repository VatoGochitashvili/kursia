"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Transient feedback for actions that succeed away from the user's focus —
 * a save, a delete, an upload finishing.
 *
 * Toasts are an addition to inline messaging, never a replacement: anything a
 * user must act on (a validation error, a failed payment) still belongs beside
 * the control that caused it, because a message that disappears on a timer is
 * a message someone will miss.
 *
 * The region is `aria-live="polite"`, so a screen reader announces the text
 * without interrupting whatever the user is doing.
 */

type Tone = "success" | "danger" | "info";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<Tone, { wrap: string; icon: IconName; iconWrap: string }> = {
  success: {
    wrap: "border-success-500/25 bg-surface",
    icon: "check",
    iconWrap: "bg-success-50 text-success-700",
  },
  danger: {
    wrap: "border-danger-500/25 bg-surface",
    icon: "alert",
    iconWrap: "bg-danger-50 text-danger-700",
  },
  info: {
    wrap: "border-brand-500/25 bg-surface",
    icon: "info",
    iconWrap: "bg-brand-50 text-brand-600",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    // Date.now() would collide when two toasts fire in the same millisecond.
    const id = nextId++;
    setToasts((current) => [...current, { id, tone, message }]);
  }, []);

  const dismiss = useCallback(
    (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

let nextId = 1;

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const style = TONE_STYLES[toast.tone];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-2xl border p-3.5 shadow-lg",
        style.wrap,
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          style.iconWrap,
        )}
      >
        <Icon name={style.icon} size={16} />
      </span>
      <p className="flex-1 pt-1 text-[13px] font-medium leading-snug text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
        aria-label="Close"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/**
 * Returns a toast function that is safe to call even outside a provider —
 * a component should never crash because feedback was unavailable.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return context ?? FALLBACK;
}

const FALLBACK: ToastApi = { show: () => undefined };
