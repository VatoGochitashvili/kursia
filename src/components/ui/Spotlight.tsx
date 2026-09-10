"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A soft highlight that follows the pointer across a group of cards.
 *
 * One listener on the container, not one per card: the position is published
 * as CSS custom properties and every child reads them, so hovering a grid of
 * twelve cards costs a single handler and no React re-render.
 *
 * Nothing here is load-bearing. It is disabled outright for a coarse pointer
 * (a finger has no hover, and the effect would just fire on tap) and for
 * anyone who asked for reduced motion.
 */
export function Spotlight({
  children,
  className,
  /** Radius of the highlight in pixels. */
  size = 380,
  /** Tailwind colour value for the glow, as a bare rgb triplet. */
  color = "53 89 240",
  opacity = 0.09,
}: {
  children: React.ReactNode;
  className?: string;
  size?: number;
  color?: string;
  opacity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduced);
  }, []);

  // Clean up a frame queued at the moment of unmount.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const node = ref.current;
      if (!node) return;

      const { clientX, clientY } = event;
      // Coalesce to one write per frame: mousemove fires far faster than the
      // compositor can paint, and the extra writes are pure cost.
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--spot-x", `${clientX - rect.left}px`);
        node.style.setProperty("--spot-y", `${clientY - rect.top}px`);
      });
    },
    [enabled],
  );

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => ref.current?.style.setProperty("--spot-opacity", "0")}
      onMouseEnter={() => ref.current?.style.setProperty("--spot-opacity", String(opacity))}
      className={cn("spotlight relative", className)}
      style={
        {
          "--spot-size": `${size}px`,
          "--spot-color": color,
          "--spot-opacity": "0",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
