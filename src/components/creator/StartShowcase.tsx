"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { ShowcaseCircle } from "@/lib/communities";
import { imageAt } from "@/lib/images";

/**
 * Circles already running, shown to somebody deciding whether to start one.
 *
 * One card at a time, because the point is the single example rather than a
 * grid to compare: the neighbours sit behind, dimmed and scaled back, so it
 * reads as a deck you can move through.
 *
 * It advances on its own every few seconds and stops the moment somebody
 * takes over — an animation that keeps moving under a person's hand is an
 * animation fighting them. Under prefers-reduced-motion it never advances by
 * itself at all.
 */
export function StartShowcase({
  circles,
  labels,
  formatEarnings,
}: {
  circles: ShowcaseCircle[];
  labels: { earns: string; members: string; previous: string; next: string };
  /** Money is formatted on the server, so the client ships no currency table. */
  formatEarnings: string[];
}) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const count = circles.length;

  const go = useCallback(
    (next: number) => {
      setHeld(true);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (held || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [held, count]);

  if (count === 0) return null;

  // The cards behind the front one stick out past the deck on purpose. On a
  // narrow screen that bleed widened the document and let the whole page
  // scroll sideways, so it is clipped here: drawn, not scrollable.
  return (
    <div className="mt-10 overflow-hidden">
      <div className="relative mx-auto flex h-[19rem] max-w-3xl items-center justify-center sm:h-[23rem]">
        {circles.map((circle, i) => {
          // Where this card sits relative to the one in front, wrapped so the
          // deck has no seam between the last card and the first.
          let offset = i - index;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const hidden = Math.abs(offset) > 1;

          return (
            <figure
              key={circle.slug}
              aria-hidden={offset !== 0}
              className={cn(
                "absolute w-[min(34rem,86vw)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                hidden && "pointer-events-none",
              )}
              style={{
                transform: `translateX(${offset * 58}%) scale(${offset === 0 ? 1 : 0.84})`,
                opacity: hidden ? 0 : offset === 0 ? 1 : 0.35,
                zIndex: offset === 0 ? 2 : 1,
                filter: offset === 0 ? undefined : "grayscale(1)",
              }}
            >
              <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
                <div className="aspect-[16/9] bg-surface-sunken">
                  {circle.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
                    <img
                      src={imageAt(circle.coverUrl, 960) ?? undefined}
                      alt=""
                      loading={offset === 0 ? "eager" : "lazy"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                {/* Stacked on a phone: side by side, the name is squeezed to
                    an ellipsis by a badge that cannot shrink. */}
                <figcaption className="flex flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-[15px] font-bold">{circle.name}</span>
                    <span className="block whitespace-nowrap text-[12.5px] text-ink-subtle">
                      {circle.members} {labels.members}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded-xl bg-success-700 px-3 py-1.5 text-[12.5px] font-bold text-white sm:text-[13px]">
                    {formatEarnings[i]}
                  </span>
                </figcaption>
              </div>
            </figure>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label={labels.previous}
            onClick={() => go(index - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Icon name="arrowLeft" size={18} />
          </button>

          <div className="flex items-center gap-2">
            {circles.map((circle, i) => (
              <button
                key={circle.slug}
                type="button"
                aria-label={circle.name}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  i === index ? "w-6 bg-brand-600" : "w-2.5 bg-line-strong hover:bg-ink-subtle",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label={labels.next}
            onClick={() => go(index + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Icon name="arrowRight" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
