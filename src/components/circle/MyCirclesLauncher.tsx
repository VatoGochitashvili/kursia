"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { localePath } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { MyCircle } from "@/lib/my-circles";
import type { Locale } from "@/lib/enums";

/**
 * A way back into your circles from anywhere on the marketplace.
 *
 * Once somebody belongs to a circle, that is what they came back for — not the
 * directory. This keeps the door one click away without adding another item to
 * a navigation bar that is already the width of the screen on a phone.
 *
 * Only rendered for someone who is actually in a circle, so it never appears
 * as an empty button with nothing behind it.
 */
export function MyCirclesLauncher({
  circles,
  locale,
  labels,
}: {
  circles: MyCircle[];
  locale: Locale;
  labels: { title: string; owner: string; admin: string; browse: string };
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Escape closes it, and so does a click anywhere else — a panel that can
  // only be dismissed by the button that opened it is a trap on a phone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (circles.length === 0) return null;

  return (
    <div ref={wrapRef} className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div className="mb-3 w-[17rem] animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <p className="border-b border-line px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
            {labels.title}
          </p>
          <ul className="max-h-[50vh] overflow-y-auto p-1.5">
            {circles.map((circle) => (
              <li key={circle.creatorId}>
                <Link
                  href={localePath(`/community/${circle.slug}`, locale)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-surface-sunken"
                >
                  <span className="h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                    {circle.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
                      <img src={circle.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {circle.name}
                    </span>
                    {circle.role !== "MEMBER" && (
                      <span className="text-[11px] text-ink-subtle">
                        {circle.role === "OWNER" ? labels.owner : labels.admin}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={localePath("/communities", locale)}
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-[13px] font-semibold text-brand-600 hover:bg-surface-sunken"
          >
            {labels.browse}
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={labels.title}
        className={cn(
          "ms-auto flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-white shadow-lg",
          "transition-transform duration-200 hover:-translate-y-0.5 active:scale-95",
        )}
      >
        <Icon name={open ? "close" : "users"} size={18} />
        <span className="text-[13px] font-semibold tabular-nums">{circles.length}</span>
      </button>
    </div>
  );
}
