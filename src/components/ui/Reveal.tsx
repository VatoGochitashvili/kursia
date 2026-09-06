"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Reveals its children as they scroll into view.
 *
 * Two things this deliberately does NOT do:
 *
 *  • It does not hide content from anyone who matters. The server renders the
 *    children normally; only a mounted client adds the hidden state, so a
 *    crawler, a reader with JavaScript disabled, or a failed hydration all see
 *    the content. Animating in from a server-rendered `opacity: 0` is the
 *    common version of this component and it silently hides pages.
 *  • It does not animate for people who asked not to be animated —
 *    prefers-reduced-motion skips straight to the visible state.
 *
 * The observer disconnects after firing: a reveal is a one-shot, and leaving
 * observers attached across a long page costs more than it returns.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Stagger, in milliseconds. Keep under ~250ms or it reads as lag. */
  delay?: number;
  className?: string;
}) {
  // Always a <div>: a polymorphic `as` here buys nothing and makes the ref
  // type a union of every element it could be.
  const ref = useRef<HTMLDivElement>(null);
  // Starts false so the server-rendered markup is plain, visible content.
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(true);
      return;
    }

    // Anything already on screen at mount should not fade in — that reads as a
    // flash on first paint rather than a reveal.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setArmed(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return;
    }

    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);

    /*
     * Dead-man's switch. IntersectionObserver callbacks do not run while a tab
     * is backgrounded or otherwise not being rendered, so a page opened in a
     * background tab could sit with its content faded out. Content staying
     * invisible is a far worse outcome than an animation being skipped, so
     * force the visible state regardless after a beat.
     */
    const failsafe = setTimeout(() => {
      setShown(true);
      observer.disconnect();
    }, 1500);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(armed && "reveal", shown && "reveal-in", className)}
      style={armed && !shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
