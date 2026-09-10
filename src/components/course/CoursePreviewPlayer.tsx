"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The course trailer, with the thumbnail as its fallback.
 *
 * A <video> whose source 404s renders as an inert black rectangle — no
 * error, no poster, nothing to click. That is not hypothetical: with
 * STORAGE_DRIVER=local on a host with an ephemeral filesystem, every
 * uploaded file disappears at the next deploy while the database keeps
 * pointing at it, and the first place that shows is right here, at the top
 * of the page a buyer is looking at.
 *
 * Recovering from it needs BOTH checks below, and the second is the one that
 * actually fires in practice:
 *
 *  • `onError` catches a failure that happens after hydration.
 *  • The mount check catches one that already happened. The element is
 *    server-rendered with `preload="metadata"`, so the browser starts
 *    fetching as soon as the HTML parses — well before React hydrates and
 *    attaches any handler. By then the `error` event has been and gone, and
 *    since media `error` events do not bubble there is nothing for React's
 *    delegated listener to pick up either. Only the element's own retained
 *    state still records it.
 */
export function CoursePreviewPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string | null;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // NETWORK_NO_SOURCE (3) means the browser gave up on every candidate
    // source; `error` is set once a specific load failed.
    if (video.error || video.networkState === video.NETWORK_NO_SOURCE) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    if (!poster) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- thumbnails come
      // from arbitrary configured storage hosts, which next/image would need
      // allow-listed at build time.
      <img src={poster} alt={title} className="h-full w-full object-cover" />
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster ?? undefined}
      controls
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className="h-full w-full bg-ink object-cover"
    />
  );
}
