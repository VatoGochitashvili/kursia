"use client";

import { useEffect, useRef, useState } from "react";
import { formatCount } from "@/lib/format";
import type { Locale } from "@/lib/enums";

/**
 * Counts a statistic up when it scrolls into view.
 *
 * The server renders the FINAL value, so the number is correct in the HTML for
 * a crawler, for a reader without JavaScript, and for anyone with
 * prefers-reduced-motion. Only a mounted client rewinds it and animates —
 * which means the animation can never leave a wrong number on screen if
 * anything goes wrong.
 */
export function CountUp({
  value,
  locale,
  durationMs = 1100,
  className,
}: {
  value: number;
  locale: Locale;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let cancelled = false;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min((now - start) / durationMs, 1);
        // easeOutExpo — fast, then settles, which reads as confident rather
        // than laboured.
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setDisplay(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setDisplay(0);
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {formatCount(display, locale)}
    </span>
  );
}
