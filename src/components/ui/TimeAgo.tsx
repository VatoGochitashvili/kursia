"use client";

import { useEffect, useState } from "react";
import { formatShortDate, relativeTime } from "@/lib/format";
import type { Locale } from "@/lib/enums";

/**
 * Relative timestamps ("5 days ago") without a hydration mismatch.
 *
 * A relative time is derived from `Date.now()`, which differs between the
 * server render and the client hydration — that is a genuine text mismatch and
 * React (rightly) complains. So the first paint is the ABSOLUTE date, which is
 * deterministic, and the component upgrades to the relative form after mount.
 *
 * It renders a real <time datetime> element, so the machine-readable timestamp
 * is in the HTML either way — good for assistive tech and for crawlers.
 */
export function TimeAgo({
  date,
  locale,
  className,
}: {
  date: Date | string;
  locale: Locale;
  className?: string;
}) {
  const iso = typeof date === "string" ? date : date.toISOString();
  const [label, setLabel] = useState(() => formatShortDate(iso, locale));

  useEffect(() => {
    setLabel(relativeTime(iso, locale));
    // Refresh once a minute so a page left open does not go stale.
    const timer = setInterval(() => setLabel(relativeTime(iso, locale)), 60_000);
    return () => clearInterval(timer);
  }, [iso, locale]);

  return (
    <time dateTime={iso} className={className}>
      {label}
    </time>
  );
}
