"use client";

import { useEffect, useRef } from "react";

/**
 * How far through the page the reader is, drawn under the sticky header.
 *
 * A course page is long — description, curriculum, reviews, FAQ — and there
 * is otherwise nothing telling you whether you are near the end or barely
 * started. This is the cheapest possible answer to that.
 *
 * It writes `transform` straight to the node inside a rAF rather than going
 * through React state: scroll fires far faster than a component can usefully
 * re-render, and a progress bar that re-renders a tree on every scroll event
 * is worse than no progress bar. `scaleX` is compositor-only, so the whole
 * effect costs nothing on the main thread.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      frame.current = null;
      const doc = document.documentElement;
      // The last viewport-height of a page is not "scrollable distance".
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, doc.scrollTop / scrollable)) : 0;
      node.style.transform = `scaleX(${ratio})`;
    };

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
      aria-hidden="true"
      role="presentation"
    >
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-brand-500 to-accent-500"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
