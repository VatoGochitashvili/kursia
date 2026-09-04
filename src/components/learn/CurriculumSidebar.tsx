"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/primitives";
import { formatDuration } from "@/lib/format";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

export interface SidebarLesson {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isFreePreview: boolean;
  isCompleted: boolean;
  unlocked: boolean;
}

export interface SidebarModule {
  id: string;
  title: string;
  lessons: SidebarLesson[];
}

const TYPE_ICON: Record<string, IconName> = {
  VIDEO: "play",
  TEXT: "file",
  PDF: "file",
  FILE: "download",
  QUIZ: "check",
  ASSIGNMENT: "edit",
};

/**
 * Course curriculum in the player.
 *
 * On desktop it is a persistent left rail; on mobile it becomes a full-height
 * drawer, because the video must own the screen on a phone. Locked rows are
 * rendered as plain text with a padlock — the server never sends their content.
 */
export function CurriculumSidebar({
  modules,
  currentLessonId,
  courseSlug,
  courseTitle,
  progressPercent,
  completedLessons,
  totalLessons,
  locale,
  labels,
  variant = "desktop",
  onNavigate,
}: {
  modules: SidebarModule[];
  currentLessonId: string;
  courseSlug: string;
  courseTitle: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  locale: Locale;
  labels: Record<string, string>;
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
}) {
  // The module containing the current lesson starts expanded.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const m of modules) {
      initial[m.id] = m.lessons.some((l) => l.id === currentLessonId);
    }
    return initial;
  });

  return (
    <div className={cn("flex h-full flex-col bg-surface", variant === "desktop" && "border-e border-line")}>
      <div className="shrink-0 border-b border-line p-4">
        <Link
          href={`/courses/${courseSlug}`}
          className="line-clamp-2 text-sm font-bold text-ink hover:text-brand-600"
        >
          {courseTitle}
        </Link>
        <div className="mt-3">
          <ProgressBar value={progressPercent} showLabel tone={progressPercent === 100 ? "success" : "brand"} />
          <p className="mt-1.5 text-[12px] text-ink-subtle">
            {completedLessons} / {totalLessons} {labels.completed}
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label={labels.curriculum}>
        {modules.map((module, mi) => {
          const done = module.lessons.filter((l) => l.isCompleted).length;
          const isOpen = open[module.id] ?? mi === 0;

          return (
            <section key={module.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [module.id]: !isOpen }))}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-surface-sunken"
              >
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[13px] font-semibold text-ink">{module.title}</span>
                  <span className="mt-0.5 block text-[11px] tabular-nums text-ink-subtle">
                    {done}/{module.lessons.length} {labels.completed}
                  </span>
                </span>
                <Icon
                  name="chevronDown"
                  size={15}
                  className={cn("shrink-0 text-ink-subtle transition-transform", isOpen && "rotate-180")}
                />
              </button>

              {isOpen && (
                <ul>
                  {module.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const content = (
                      <>
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            lesson.isCompleted
                              ? "border-success-500 bg-success-500 text-white"
                              : isCurrent
                                ? "border-brand-500 text-brand-600"
                                : "border-line-strong text-ink-subtle",
                          )}
                        >
                          <Icon
                            name={
                              lesson.isCompleted
                                ? "check"
                                : lesson.unlocked
                                  ? (TYPE_ICON[lesson.type] ?? "file")
                                  : "lock"
                            }
                            size={11}
                            filled={lesson.isCompleted}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "line-clamp-2 text-[13px] leading-snug",
                              isCurrent ? "font-semibold text-brand-700" : "text-ink-muted",
                              !lesson.unlocked && "text-ink-subtle",
                            )}
                          >
                            {lesson.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-subtle">
                            {lesson.durationSeconds > 0 && (
                              <span className="tabular-nums">
                                {formatDuration(lesson.durationSeconds, locale)}
                              </span>
                            )}
                            {lesson.isFreePreview && !lesson.unlocked && (
                              <span className="font-semibold text-success-700">{labels.preview}</span>
                            )}
                          </span>
                        </span>
                      </>
                    );

                    return (
                      <li key={lesson.id}>
                        {lesson.unlocked ? (
                          <Link
                            href={`/learn/${courseSlug}?lesson=${lesson.id}`}
                            onClick={onNavigate}
                            aria-current={isCurrent ? "true" : undefined}
                            className={cn(
                              "flex items-start gap-2.5 px-4 py-2.5 transition-colors",
                              isCurrent ? "bg-brand-50" : "hover:bg-surface-muted",
                            )}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            className="flex cursor-not-allowed items-start gap-2.5 px-4 py-2.5 opacity-70"
                            title={labels.lockedHint}
                          >
                            {content}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </nav>
    </div>
  );
}
