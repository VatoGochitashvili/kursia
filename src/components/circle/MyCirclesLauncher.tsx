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
  labels: {
    title: string;
    owner: string;
    admin: string;
    browse: string;
    youRun: string;
    youAreIn: string;
  };
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

  const managed = circles.filter((c) => c.role !== "MEMBER");
  const joined = circles.filter((c) => c.role === "MEMBER");
  const pendingTotal = managed.reduce((sum, c) => sum + c.pendingRequests, 0);

  return (
    <div ref={wrapRef} className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div className="mb-3 w-[17rem] animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <p className="border-b border-line px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
            {labels.title}
          </p>
          <div className="max-h-[50vh] overflow-y-auto p-1.5">
            {/* Two lists, not one: the rooms you answer for come first, with
                the applications waiting in them, and the rooms you simply
                belong to follow. One mixed list makes an admin hunt for the
                circle that needs them. */}
            {[
              { key: "run", label: labels.youRun, rows: managed },
              { key: "in", label: labels.youAreIn, rows: joined },
            ]
              .filter((group) => group.rows.length > 0)
              .map((group) => (
                <section key={group.key}>
                  {managed.length > 0 && joined.length > 0 && (
                    <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
                      {group.label}
                    </p>
                  )}
                  <ul>
                    {group.rows.map((circle) => (
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
                          {circle.pendingRequests > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                              {circle.pendingRequests}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
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
          "relative ms-auto flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-white shadow-lg",
          "transition-transform duration-200 hover:-translate-y-0.5 active:scale-95",
        )}
      >
        <Icon name={open ? "close" : "users"} size={18} />
        <span className="text-[13px] font-semibold tabular-nums">{circles.length}</span>
        {/* Something is waiting in a room you run — visible without opening
            the panel, which is the whole point of a launcher. */}
        {pendingTotal > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
            {pendingTotal}
          </span>
        )}
      </button>
    </div>
  );
}
