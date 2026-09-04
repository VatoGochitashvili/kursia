"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Button";
import { formatTimecode } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PlaybackSource {
  url: string;
  kind: "mp4" | "hls" | "dash";
  captionsUrl?: string | null;
  poster?: string | null;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Custom video player.
 *
 * Built on the native <video> element with `controlsList="nodownload"` and the
 * context menu suppressed, fed by a short-lived, user-bound URL from
 * /api/lessons/:id/playback. That combination removes the casual "copy video
 * address" path — a determined user can always capture what their own screen
 * renders, so the goal here is to stop link sharing, not to pretend at DRM.
 *
 * Progress is reported on a throttle (and on pause/unload) so a student's
 * resume point survives a closed tab without hammering the API.
 */
export function VideoPlayer({
  lessonId,
  poster,
  resumeAt = 0,
  onProgress,
  onEnded,
  labels,
}: {
  lessonId: string;
  poster?: string | null;
  resumeAt?: number;
  onProgress?: (positionSeconds: number, watchedSeconds: number) => void;
  onEnded?: () => void;
  labels: Record<string, string>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<PlaybackSource | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const lastReport = useRef(0);
  const watched = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch a fresh, account-bound playback URL for this lesson.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSource(null);

    fetch(`/api/lessons/${lessonId}/playback`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { source: PlaybackSource | null }) => {
        if (cancelled) return;
        if (!data.source) {
          setStatus("error");
          return;
        }
        setSource(data.source);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const report = useCallback(
    (force = false) => {
      const video = videoRef.current;
      if (!video || !onProgress) return;
      const now = Date.now();
      if (!force && now - lastReport.current < 10_000) return;
      lastReport.current = now;
      onProgress(Math.floor(video.currentTime), Math.floor(watched.current));
    },
    [onProgress],
  );

  // Flush progress when the tab is hidden or closed — the common way a
  // learning session actually ends.
  useEffect(() => {
    const flush = () => report(true);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [report]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(seconds, 0), video.duration);
  }, []);

  // Keyboard shortcuts, scoped to the player so they never hijack page typing.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          event.preventDefault();
          seek(video.currentTime + 10);
          break;
        case "ArrowLeft":
          event.preventDefault();
          seek(video.currentTime - 10);
          break;
        case "ArrowUp":
          event.preventDefault();
          setVolume((v) => Math.min(v + 0.1, 1));
          break;
        case "ArrowDown":
          event.preventDefault();
          setVolume((v) => Math.max(v - 0.1, 0));
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "f":
          void toggleFullscreen();
          break;
      }
    },
    [seek, togglePlay],
  );

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await containerRef.current?.requestFullscreen().catch(() => undefined);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = muted;
      video.playbackRate = speed;
    }
  }, [volume, muted, speed]);

  function armHide() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2800);
  }

  if (status === "error") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-ink text-center text-sm text-white/60">
        <div className="px-6">
          <Icon name="alert" size={26} className="mx-auto mb-2" />
          {labels.unavailable}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group/player relative aspect-video overflow-hidden rounded-xl bg-black focus:outline-none"
      onMouseMove={armHide}
      onMouseLeave={() => playing && setShowControls(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-label={labels.player}
    >
      {status === "loading" || !source ? (
        <div className="flex h-full items-center justify-center text-white/70">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={source.url}
            poster={poster ?? source.poster ?? undefined}
            playsInline
            preload="metadata"
            // Removes the browser's own "save video" affordance. Combined with
            // the expiring per-user URL this defeats casual link sharing.
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture={false}
            onContextMenu={(e) => e.preventDefault()}
            className="h-full w-full"
            onClick={togglePlay}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              setDuration(video.duration);
              // Resume where the student stopped, but not right at the end.
              if (resumeAt > 0 && resumeAt < video.duration - 5) video.currentTime = resumeAt;
            }}
            onPlay={() => {
              setPlaying(true);
              armHide();
            }}
            onPause={() => {
              setPlaying(false);
              setShowControls(true);
              report(true);
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              setCurrent(video.currentTime);
              if (!video.paused) watched.current += 0.25;
              report();
              if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
              }
            }}
            onEnded={() => {
              setPlaying(false);
              setShowControls(true);
              report(true);
              onEnded?.();
            }}
          >
            {source.captionsUrl && (
              <track
                kind="subtitles"
                src={source.captionsUrl}
                srcLang="ka"
                label={labels.captions}
                default
              />
            )}
          </video>

          {/* Big centre play affordance while paused. */}
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={labels.play}
              className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-ink shadow-xl transition-transform hover:scale-105">
                <Icon name="play" size={26} filled className="ms-1" />
              </span>
            </button>
          )}

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-200",
              showControls ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* Scrubber */}
            <div className="relative mb-2 h-4 cursor-pointer" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - rect.left) / rect.width) * duration);
            }}>
              <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-white/25">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/35"
                  style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                  style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label={labels.seek}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>

            <div className="flex items-center gap-2 text-white">
              <ControlButton onClick={togglePlay} label={playing ? labels.pause : labels.play}>
                <Icon name={playing ? "pause" : "play"} size={18} filled={!playing} />
              </ControlButton>

              <ControlButton onClick={() => seek(current - 10)} label={labels.back10}>
                <Icon name="refresh" size={17} className="-scale-x-100" />
              </ControlButton>

              <span className="ms-1 select-none text-[12px] tabular-nums text-white/85">
                {formatTimecode(current)} / {formatTimecode(duration)}
              </span>

              <div className="ms-auto flex items-center gap-1.5">
                {/* Volume — hidden on touch layouts where it is handled by the OS. */}
                <div className="hidden items-center gap-1.5 sm:flex">
                  <ControlButton onClick={() => setMuted((m) => !m)} label={labels.volume}>
                    <Icon name={muted || volume === 0 ? "close" : "megaphone"} size={17} />
                  </ControlButton>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      setMuted(false);
                    }}
                    aria-label={labels.volume}
                    className="h-1 w-16 cursor-pointer accent-white"
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSpeed((s) => !s)}
                    aria-label={labels.speed}
                    className="rounded-md px-2 py-1 text-[12px] font-semibold tabular-nums text-white/85 transition-colors hover:bg-white/15"
                  >
                    {speed}×
                  </button>
                  {showSpeed && (
                    <ul className="absolute bottom-full right-0 mb-2 overflow-hidden rounded-lg bg-ink/95 py-1 text-[13px] shadow-xl">
                      {SPEEDS.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => {
                              setSpeed(s);
                              setShowSpeed(false);
                            }}
                            className={cn(
                              "block w-full px-4 py-1.5 text-left tabular-nums transition-colors hover:bg-white/15",
                              s === speed ? "font-bold text-brand-300" : "text-white/85",
                            )}
                          >
                            {s}×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <ControlButton onClick={toggleFullscreen} label={labels.fullscreen}>
                  <Icon name={fullscreen ? "minus" : "grid"} size={17} />
                </ControlButton>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/15 hover:text-white"
    >
      {children}
    </button>
  );
}
