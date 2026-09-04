import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/format";
import type { Locale } from "@/lib/enums";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/cn";

export interface CurriculumLesson {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isFreePreview: boolean;
}

export interface CurriculumModule {
  id: string;
  title: string;
  description: string | null;
  lessons: CurriculumLesson[];
}

const TYPE_ICON: Record<string, IconName> = {
  VIDEO: "video",
  TEXT: "file",
  PDF: "file",
  FILE: "download",
  QUIZ: "check",
  ASSIGNMENT: "edit",
};

/**
 * Public curriculum. The full structure is visible before purchase — students
 * need it to decide, and it is valuable indexable content — but only lessons
 * explicitly marked as free previews are linkable. Everything else renders a
 * lock; the server never emits a playable URL for locked content.
 */
export function Curriculum({
  modules,
  locale,
  t,
  hasAccess,
  previewHref,
  defaultOpen = 1,
}: {
  modules: CurriculumModule[];
  locale: Locale;
  t: Dictionary;
  hasAccess: boolean;
  previewHref: (lessonId: string) => string;
  defaultOpen?: number;
}) {
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const totalDuration = modules.reduce(
    (s, m) => s + m.lessons.reduce((ls, l) => ls + l.durationSeconds, 0),
    0,
  );

  return (
    <div>
      <p className="mb-3 text-[13px] text-ink-muted">
        {modules.length} {t.common.modules} · {totalLessons} {t.common.lessons}
        {totalDuration > 0 && ` · ${formatDuration(totalDuration, locale)}`}
      </p>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {modules.map((module, index) => {
          const moduleDuration = module.lessons.reduce((s, l) => s + l.durationSeconds, 0);
          return (
            <details
              key={module.id}
              open={index < defaultOpen}
              className="group bg-surface [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 bg-surface-muted px-4 py-3.5 transition-colors hover:bg-surface-sunken">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    name="chevronDown"
                    size={16}
                    className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                  />
                  <span className="truncate text-[15px] font-semibold text-ink">{module.title}</span>
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">
                  {module.lessons.length} · {formatDuration(moduleDuration, locale)}
                </span>
              </summary>

              <ul className="divide-y divide-line">
                {module.lessons.map((lesson) => {
                  const unlocked = hasAccess || lesson.isFreePreview;
                  const Row = (
                    <>
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        <Icon
                          name={unlocked ? (TYPE_ICON[lesson.type] ?? "file") : "lock"}
                          size={15}
                          className={cn("shrink-0", unlocked ? "text-brand-500" : "text-ink-subtle")}
                        />
                        <span className={cn("truncate text-sm", unlocked ? "text-ink" : "text-ink-muted")}>
                          {lesson.title}
                        </span>
                        {lesson.isFreePreview && !hasAccess && (
                          <span className="shrink-0 rounded-md bg-success-50 px-1.5 py-0.5 text-[10px] font-bold text-success-700">
                            {t.courses.previewLesson}
                          </span>
                        )}
                      </span>
                      {lesson.durationSeconds > 0 && (
                        <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">
                          {formatDuration(lesson.durationSeconds, locale)}
                        </span>
                      )}
                    </>
                  );

                  return (
                    <li key={lesson.id}>
                      {unlocked ? (
                        <Link
                          href={previewHref(lesson.id)}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-brand-50/50"
                        >
                          {Row}
                        </Link>
                      ) : (
                        <div
                          className="flex items-center gap-3 px-4 py-2.5"
                          title={t.courses.lockedHint}
                        >
                          {Row}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
