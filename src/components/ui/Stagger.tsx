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
 * The per-item delay comes from `:nth-child` rules in globals.css, driven by
 * a --stagger-step custom property set on this container, NOT from an inline
 * style on each child. Cloning can only add a `style` prop, and a child like
 * <CourseCard> is a component that forwards `className` but not `style` — so
 * an inline delay silently vanished and every card animated at once, which
 * is the exact thing this component exists to avoid. A CSS rule applies to
 * whatever the child renders, component or plain element.
 *
 * The cascade is capped — past a few hundred milliseconds the last item
 * arrives well after the reader's eye, which reads as lag, not polish.
 */
export function Stagger({
  children,
  step = 70,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  /** Gap between consecutive children, in milliseconds. */
  step?: number;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  // The delays have to outlive the moment the transition starts. Dropping
  // them in the same commit that adds `reveal-in` strips the delay before
  // the browser ever begins the animation, and every child moves at once.
  const [cascading, setCascading] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    setArmed(true);
    setCascading(true);

    // Already on screen at mount: run the cascade now rather than waiting for
    // a scroll that may never come.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      /*
       * rAF is the nice path, but it does not run at all while the tab is
       * hidden — so a page opened in a background tab, or restored behind
       * another, would sit here with its content faded out forever. The
       * observer branch below already guards against that; this branch
       * returned early and skipped the guard entirely.
       */
      let done = false;
      const show = () => {
        if (done) return;
        done = true;
        setShown(true);
      };
      requestAnimationFrame(() => requestAnimationFrame(show));
      const onscreenFailsafe = setTimeout(show, 1500);
      return () => clearTimeout(onscreenFailsafe);
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

  // Once every child has arrived, stop delaying transitions on this subtree —
  // otherwise a card would sit still for up to half a second before answering
  // a hover, using the very delay that staggered its entrance.
  useEffect(() => {
    if (!shown || !cascading) return;
    const settle = setTimeout(() => setCascading(false), step * 8 + 800);
    return () => clearTimeout(settle);
  }, [shown, cascading, step]);

  return (
    <As
      ref={ref as never}
      className={cn(cascading && "stagger", className)}
      style={{ "--stagger-step": `${step}ms` } as CSSProperties}
    >
      {Children.map(children, (child) => {
        if (!isValidElement<{ className?: string }>(child)) return child;
        return cloneElement(child, {
          className: cn(child.props.className, armed && "reveal", shown && "reveal-in"),
        });
      })}
    </As>
  );
}
