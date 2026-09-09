"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar across the top of the page during client navigation.
 *
 * Server components stream, so a slow page shows the *old* screen with no
 * sign anything is happening — on a small instance that reads as a dead
 * click, and people click again. This is the feedback that says "received".
 *
 * There is no navigation-start event in the App Router, so the start is
 * inferred from a click on an internal link (capture phase, before React
 * routing) and the finish from the pathname or query actually changing.
 * The bar creeps toward 90% on an easing curve rather than pretending to
 * know the real duration, then snaps to 100% and fades.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  // The first render is the initial page load, not a navigation.
  const routeKey = `${pathname}?${searchParams}`;
  const settledRef = useRef(routeKey);

  // ── Finish whenever the route actually changed ──────────────────────────
  useEffect(() => {
    if (settledRef.current === routeKey) return;
    settledRef.current = routeKey;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    const done = setTimeout(() => setProgress(null), 280);
    return () => clearTimeout(done);
  }, [routeKey]);

  // ── Start on a click that will navigate ─────────────────────────────────
  useEffect(() => {
    function start() {
      if (timerRef.current) return;
      setProgress(8);
      timerRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current === null) return current;
          // Decelerate as it approaches 90 — never reach it on its own.
          const remaining = 90 - current;
          return remaining <= 0.5 ? current : current + remaining * 0.06;
        });
      }, 120);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      // Same page, or only a hash change — nothing will load.
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Clear the interval if this ever unmounts mid-navigation.
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  if (progress === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]"
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500 shadow-[0_0_10px_rgb(53_89_240_/_0.6)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? "width 180ms ease-out, opacity 260ms ease 120ms" : "width 200ms ease-out",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
