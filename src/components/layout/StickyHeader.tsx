"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Wraps the header so it reacts to scroll.
 *
 * At the top of a page the header sits flush with the hero and needs no
 * edge at all; once content is moving underneath it, it needs to separate
 * from that content or the two blur together. So it gains a border, a
 * shadow and stronger glass exactly when there is something to sit above.
 *
 * The scroll listener is passive and writes one boolean, so it does not
 * re-render on every frame — only on the two crossings of the threshold.
 * The header markup itself stays a server component; only this shell is
 * client-side, which keeps navigation in the initial HTML.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // A little past the header's own height, so it does not flicker as the
      // page settles by a pixel or two on load.
      setScrolled(window.scrollY > 12);
    };

    onScroll(); // A reload part-way down a page starts scrolled.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled
          ? "border-b border-line bg-surface/80 shadow-sm backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-surface/60 backdrop-blur-sm",
      )}
    >
      {children}
    </header>
  );
}
