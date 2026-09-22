"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export interface MenuAction {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  /** Draws it in red: deleting, removing, throwing somebody out. */
  danger?: boolean;
  /** Skipped entirely — simpler at the call site than filtering the array. */
  hidden?: boolean;
}

/**
 * The three dots.
 *
 * Actions that used to sit in a row of small buttons live behind one control,
 * so a post or a member row reads as content first and a set of powers second.
 * It closes on Escape, on a click elsewhere and after any choice.
 */
export function MenuButton({
  actions,
  label,
  align = "end",
  children,
}: {
  actions: MenuAction[];
  /** For screen readers: "options for this post", "options for this member". */
  label: string;
  align?: "start" | "end";
  /** Optional extra content at the top of the panel, e.g. a heading. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const visible = actions.filter((a) => !a.hidden);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 w-56 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl",
            align === "end" ? "end-0" : "start-0",
          )}
        >
          {children}
          {visible.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-[13px] font-medium transition-colors",
                action.danger
                  ? "text-danger-700 hover:bg-danger-50"
                  : "text-ink hover:bg-surface-sunken",
              )}
            >
              {action.icon && <Icon name={action.icon} size={15} />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Three dots. Inline rather than in the icon set, which has no such glyph. */
function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
