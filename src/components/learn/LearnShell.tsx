"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client/fetcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Alert, ProgressBar } from "@/components/ui/primitives";
import { CurriculumSidebar, type SidebarModule } from "./CurriculumSidebar";
import { VideoPlayer } from "./VideoPlayer";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

export type LearnTab = "overview" | "notes" | "discussion" | "resources";

/**
 * The learning shell.
 *
 * Desktop: persistent curriculum rail on the left, content in the centre.
 * Mobile: the video owns the viewport and the curriculum becomes a drawer —
 * this is the difference between a website that happens to play video and
 * something that feels like a learning app on a phone.
 */
export function LearnShell({
  courseSlug,
  courseTitle,
  lessonId,
  lessonTitle,
  lessonType,
  isVideo,
  posterUrl,
  resumeAt,
  isCompleted,
  isEnrolled,
  modules,
  progressPercent,
  completedLessons,
  totalLessons,
  previous,
  next,
  locale,
  labels,
  children,
  tabs,
}: {
  courseSlug: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonType: string;
  isVideo: boolean;
  posterUrl: string | null;
  resumeAt: number;
  isCompleted: boolean;
  isEnrolled: boolean;
  modules: SidebarModule[];
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  locale: Locale;
  labels: Record<string, string>;
  children: ReactNode;
  tabs: { overview: ReactNode; notes: ReactNode; discussion: ReactNode; resources: ReactNode };
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<LearnTab>("overview");
  const [completed, setCompleted] = useState(isCompleted);
  const [saving, setSaving] = useState(false);

  // Keep local completion state honest when the server re-renders the page
  // (e.g. after a quiz pass marks the lesson complete).
  useEffect(() => setCompleted(isCompleted), [isCompleted, lessonId]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const reportProgress = useCallback(
    (positionSeconds: number, watchedSeconds: number) => {
      if (!isEnrolled) return;
      void api
        .post("/api/progress", { lessonId, positionSeconds, watchedSeconds })
        .catch(() => undefined);
    },
    [isEnrolled, lessonId],
  );

  async function toggleComplete(value: boolean) {
    if (!isEnrolled) return;
    setSaving(true);
    setCompleted(value); // optimistic
    try {
      await api.post("/api/progress", { lessonId, isCompleted: value });
      router.refresh();
    } catch {
      setCompleted(!value);
    } finally {
      setSaving(false);
    }
  }

  function goTo(id: string) {
    router.push(`/learn/${courseSlug}?lesson=${id}`);
  }

  const sidebar = (variant: "desktop" | "drawer") => (
    <CurriculumSidebar
      variant={variant}
      modules={modules}
      currentLessonId={lessonId}
      courseSlug={courseSlug}
      courseTitle={courseTitle}
      progressPercent={progressPercent}
      completedLessons={completedLessons}
      totalLessons={totalLessons}
      locale={locale}
      labels={labels}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-4">
        <Link
          href={`/courses/${courseSlug}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          aria-label={labels.backToCourse}
        >
          <Icon name="arrowLeft" size={18} />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{lessonTitle}</p>
          <p className="truncate text-[11px] text-ink-subtle">{courseTitle}</p>
        </div>

        <div className="hidden w-40 shrink-0 items-center gap-2 sm:flex">
          <ProgressBar value={progressPercent} showLabel />
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-ink lg:hidden"
        >
          <Icon name="list" size={15} />
          <span className="hidden sm:inline">{labels.curriculum}</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop rail */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-14 h-[calc(100dvh-3.5rem)]">{sidebar("desktop")}</div>
        </aside>

        {/* Main column */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-4xl p-3 sm:p-5 lg:p-7">
            {isVideo ? (
              <VideoPlayer
                lessonId={lessonId}
                poster={posterUrl}
                resumeAt={resumeAt}
                onProgress={reportProgress}
                onEnded={() => {
                  // Finishing the video marks the lesson complete, which is
                  // what students expect and what drives course progress.
                  if (!completed) void toggleComplete(true);
                }}
                labels={{
                  player: labels.player,
                  play: labels.play,
                  pause: labels.pause,
                  seek: labels.seek,
                  volume: labels.volume,
                  speed: labels.playbackSpeed,
                  fullscreen: labels.fullscreen,
                  captions: labels.captions,
                  back10: labels.back10,
                  unavailable: labels.videoUnavailable,
                }}
              />
            ) : null}

            <div className="mt-5">
              <h1 className="text-xl sm:text-2xl">{lessonTitle}</h1>
            </div>

            {/* Lesson body (text, PDF, quiz, assignment) */}
            <div className="mt-5">{children}</div>

            {/* Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
              {isEnrolled && lessonType !== "QUIZ" && (
                <Button
                  variant={completed ? "outline" : "primary"}
                  loading={saving}
                  onClick={() => toggleComplete(!completed)}
                >
                  <Icon name="check" size={16} />
                  {completed ? labels.markedComplete : labels.markComplete}
                </Button>
              )}

              <div className="ms-auto flex items-center gap-2">
                {previous && (
                  <Button variant="ghost" onClick={() => goTo(previous.id)}>
                    <Icon name="chevronLeft" size={16} />
                    <span className="hidden sm:inline">{labels.prevLesson}</span>
                  </Button>
                )}
                {next && (
                  <Button variant="secondary" onClick={() => goTo(next.id)}>
                    <span className="hidden sm:inline">{labels.nextLesson}</span>
                    <Icon name="chevronRight" size={16} />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8">
              <div
                role="tablist"
                aria-label={labels.overview}
                className="flex gap-1 overflow-x-auto border-b border-line"
              >
                {(
                  [
                    ["overview", labels.overview],
                    ["notes", labels.notes],
                    ["discussion", labels.discussion],
                    ["resources", labels.resources],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    type="button"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors",
                      tab === key
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" className="py-5">
                {tabs[tab]}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="safe-t absolute inset-y-0 start-0 flex w-[min(22rem,92vw)] animate-fade-in flex-col bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-ink">{labels.curriculum}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={labels.close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 safe-b">{sidebar("drawer")}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shown in place of lesson content when the viewer is not entitled. */
export function LockedLesson({
  courseSlug,
  labels,
}: {
  courseSlug: string;
  labels: Record<string, string>;
}) {
  return (
    <Alert tone="warn" title={labels.locked}>
      <p className="mb-3">{labels.lockedHint}</p>
      <ButtonLink href={`/courses/${courseSlug}`} size="sm">
        {labels.buyNow}
      </ButtonLink>
    </Alert>
  );
}
