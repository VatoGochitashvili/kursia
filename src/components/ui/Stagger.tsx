"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Reveals its children one after another as the group scrolls into view.
 *
 * A whole grid fading in at once reads as a page that was slow to load. The
 * same grid arriving in sequence reads as deliberate — most of what people
 * call "premium feel" on a marketing page is this.
 *
 * It inherits the safety model of <Reveal> exactly, and for the same reasons:
 *
 *  • The server renders children plainly and visibly. Only a mounted client
 *    adds the hidden state, so a crawler, a reader without JavaScript, or a
 *    failed hydration all see real content. Animating in from a
 *    server-rendered `opacity: 0` is the common version of this and it
 *    silently hides pages.
 *  • prefers-reduced-motion skips straight to visible.
 *  • A dead-man's switch shows everything after 1.5s regardless, because
 *    IntersectionObserver callbacks do not run in a backgrounded tab, and
 *    invisible content is far worse than a skipped animation.
 *
 * Children are cloned rather than wrapped: a wrapper <div> would sit between
 * a <ul> and its <li>s, and would become the grid item in place of the child
 * the layout was written for.
 *
 * The cascade is capped — past a few hundred milliseconds the last item
 * arrives well after the reader's eye, which reads as lag, not polish.
 */
export function Stagger({
  children,
  step = 70,
  maxDelay = 560,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  /** Gap between consecutive children, in milliseconds. */
  step?: number;
  /** Nothing waits longer than this, however many children there are. */
  maxDelay?: number;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    setArmed(true);

    // Already on screen at mount: run the cascade now rather than waiting for
    // a scroll that may never come.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.04 },
    );
    observer.observe(node);

    const failsafe = setTimeout(() => {
      setShown(true);
      observer.disconnect();
    }, 1500);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  let index = 0;

  return (
    <As ref={ref as never} className={className}>
      {Children.map(children, (child) => {
        if (!isValidElement<{ className?: string; style?: CSSProperties }>(child)) return child;

        const delay = Math.min(index++ * step, maxDelay);
        return cloneElement(child, {
          className: cn(child.props.className, armed && "reveal", shown && "reveal-in"),
          style:
            armed && !shown
              ? { ...child.props.style, transitionDelay: `${delay}ms` }
              : child.props.style,
        });
      })}
    </As>
  );
}
