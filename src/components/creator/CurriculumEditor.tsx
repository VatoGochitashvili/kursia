"use client";

import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/enums";

export interface EditorLesson {
  id: string;
  title: string;
  description: string | null;
  type: string;
  sortOrder: number;
  moduleId: string;
  isFreePreview: boolean;
  isPublished: boolean;
  durationSeconds: number;
  textContent: string | null;
  assetKey: string | null;
}

export interface EditorModule {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: EditorLesson[];
}

const LESSON_TYPES: { value: string; icon: IconName; labelKa: string; labelEn: string }[] = [
  { value: "VIDEO", icon: "video", labelKa: "ვიდეო", labelEn: "Video" },
  { value: "TEXT", icon: "file", labelKa: "ტექსტი", labelEn: "Text" },
  { value: "PDF", icon: "file", labelKa: "PDF", labelEn: "PDF" },
  { value: "QUIZ", icon: "check", labelKa: "ქვიზი", labelEn: "Quiz" },
  { value: "ASSIGNMENT", icon: "edit", labelKa: "დავალება", labelEn: "Assignment" },
];

/**
 * Curriculum editor.
 *
 * Reordering uses the native HTML5 drag-and-drop API (no dependency) and
 * always sends the FULL ordered id list to the server, which reindexes in one
 * transaction. That is idempotent and immune to the lost-update problems that
 * per-item index deltas cause when two tabs are open.
 *
 * Every list also has keyboard-accessible move up/down buttons — drag-and-drop
 * alone would exclude keyboard and screen-reader users.
 */
export function CurriculumEditor({
  courseId,
  initialModules,
  locale,
  labels,
}: {
  courseId: string;
  initialModules: EditorModule[];
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [modules, setModules] = useState(initialModules);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const dragged = useRef<{ type: "module" | "lesson"; id: string } | null>(null);

  const label = (item: { labelKa: string; labelEn: string }) =>
    locale === "en" ? item.labelEn : item.labelKa;

  // ── Modules ──────────────────────────────────────────────────────────────

  async function addModule() {
    setBusy("module");
    setError(null);
    try {
      const created = await api.post<EditorModule>(`/api/courses/${courseId}/modules`, {
        title: `${labels.moduleTitle} ${modules.length + 1}`,
      });
      setModules((prev) => [...prev, { ...created, lessons: [] }]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function renameModule(moduleId: string, title: string) {
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
    await api.patch(`/api/modules/${moduleId}`, { title }).catch(setError);
  }

  async function deleteModule(moduleId: string) {
    if (!confirm(labels.confirmDeleteModule)) return;
    const snapshot = modules;
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    try {
      await api.delete(`/api/modules/${moduleId}`);
    } catch (err) {
      setModules(snapshot);
      setError(err);
    }
  }

  async function persistModuleOrder(next: EditorModule[]) {
    setModules(next);
    await api
      .patch(`/api/courses/${courseId}/modules`, { ids: next.map((m) => m.id) })
      .catch(setError);
  }

  function moveModule(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    const next = [...modules];
    [next[index], next[target]] = [next[target]!, next[index]!];
    void persistModuleOrder(next);
  }

  // ── Lessons ──────────────────────────────────────────────────────────────

  async function addLesson(moduleId: string, type: string) {
    setBusy(moduleId);
    setError(null);
    try {
      const created = await api.post<EditorLesson>("/api/lessons", {
        moduleId,
        title: labels.newLesson,
        type,
      });
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...m.lessons, { ...created, description: null, textContent: null }] }
            : m,
        ),
      );
      setEditingLesson(created.id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function updateLesson(lessonId: string, patch: Partial<EditorLesson>) {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
      })),
    );
    await api.patch(`/api/lessons/${lessonId}`, patch).catch(setError);
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm(labels.confirmDeleteLesson)) return;
    const snapshot = modules;
    setModules((prev) =>
      prev.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })),
    );
    try {
      await api.delete(`/api/lessons/${lessonId}`);
    } catch (err) {
      setModules(snapshot);
      setError(err);
    }
  }

  /** Send the whole course's lesson order, flattened in display order. */
  async function persistLessonOrder(next: EditorModule[]) {
    setModules(next);
    const ids = next.flatMap((m) => m.lessons.map((l) => l.id));
    await api
      .patch(`/api/lessons?courseId=${encodeURIComponent(courseId)}`, { ids })
      .catch(setError);
  }

  function moveLesson(moduleId: string, index: number, direction: -1 | 1) {
    const next = modules.map((m) => ({ ...m, lessons: [...m.lessons] }));
    const module = next.find((m) => m.id === moduleId);
    if (!module) return;
    const target = index + direction;
    if (target < 0 || target >= module.lessons.length) return;
    [module.lessons[index], module.lessons[target]] = [
      module.lessons[target]!,
      module.lessons[index]!,
    ];
    void persistLessonOrder(next);
  }

  /** Drop a lesson into a (possibly different) module at a given position. */
  function dropLesson(targetModuleId: string, targetIndex: number) {
    const draggedItem = dragged.current;
    if (!draggedItem || draggedItem.type !== "lesson") return;

    const next = modules.map((m) => ({ ...m, lessons: [...m.lessons] }));
    let moving: EditorLesson | undefined;
    for (const module of next) {
      const index = module.lessons.findIndex((l) => l.id === draggedItem.id);
      if (index >= 0) {
        moving = module.lessons.splice(index, 1)[0];
        break;
      }
    }
    if (!moving) return;

    const target = next.find((m) => m.id === targetModuleId);
    if (!target) return;
    target.lessons.splice(targetIndex, 0, { ...moving, moduleId: targetModuleId });

    void persistLessonOrder(next);
    // A cross-module move also changes the lesson's parent.
    if (moving.moduleId !== targetModuleId) {
      void api.patch(`/api/lessons/${moving.id}`, { moduleId: targetModuleId }).catch(setError);
    }
    dragged.current = null;
  }

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="space-y-4">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          {modules.length} {labels.modules} · {totalLessons} {labels.lessons}
        </p>
        <Button size="sm" variant="outline" loading={busy === "module"} onClick={addModule}>
          <Icon name="plus" size={15} />
          {labels.addModule}
        </Button>
      </div>

      {modules.map((module, moduleIndex) => (
        <div
          key={module.id}
          className="overflow-hidden rounded-2xl border border-line bg-surface"
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-2.5">
            <span className="cursor-grab text-ink-subtle" aria-hidden="true">
              <Icon name="drag" size={16} />
            </span>

            <Input
              value={module.title}
              onChange={(e) => renameModule(module.id, e.target.value)}
              aria-label={labels.moduleTitle}
              className="h-9 flex-1 border-transparent bg-transparent font-semibold hover:border-line-strong focus:bg-surface"
            />

            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton
                label={labels.moveUp}
                icon="chevronUp"
                disabled={moduleIndex === 0}
                onClick={() => moveModule(moduleIndex, -1)}
              />
              <IconButton
                label={labels.moveDown}
                icon="chevronDown"
                disabled={moduleIndex === modules.length - 1}
                onClick={() => moveModule(moduleIndex, 1)}
              />
              <IconButton
                label={labels.delete}
                icon="trash"
                danger
                onClick={() => deleteModule(module.id)}
              />
            </div>
          </div>

          <ul className="divide-y divide-line">
            {module.lessons.map((lesson, lessonIndex) => (
              <li
                key={lesson.id}
                draggable
                onDragStart={() => {
                  dragged.current = { type: "lesson", id: lesson.id };
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropLesson(module.id, lessonIndex)}
                className="bg-surface"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="cursor-grab text-ink-subtle" aria-hidden="true">
                    <Icon name="drag" size={15} />
                  </span>

                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      lesson.assetKey || lesson.textContent || lesson.type === "QUIZ"
                        ? "bg-brand-50 text-brand-600"
                        : "bg-warn-50 text-warn-700",
                    )}
                    title={
                      lesson.assetKey || lesson.textContent || lesson.type === "QUIZ"
                        ? undefined
                        : labels.noContent
                    }
                  >
                    <Icon
                      name={LESSON_TYPES.find((x) => x.value === lesson.type)?.icon ?? "file"}
                      size={14}
                    />
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditingLesson(editingLesson === lesson.id ? null : lesson.id)}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {lesson.title}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-ink-subtle">
                      {lesson.durationSeconds > 0 && (
                        <span>{formatDuration(lesson.durationSeconds, locale)}</span>
                      )}
                      {lesson.isFreePreview && (
                        <span className="font-semibold text-success-700">{labels.freePreview}</span>
                      )}
                      {!lesson.isPublished && <span>{labels.hidden}</span>}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      label={labels.moveUp}
                      icon="chevronUp"
                      disabled={lessonIndex === 0}
                      onClick={() => moveLesson(module.id, lessonIndex, -1)}
                    />
                    <IconButton
                      label={labels.moveDown}
                      icon="chevronDown"
                      disabled={lessonIndex === module.lessons.length - 1}
                      onClick={() => moveLesson(module.id, lessonIndex, 1)}
                    />
                    <IconButton
                      label={labels.edit}
                      icon="edit"
                      onClick={() =>
                        setEditingLesson(editingLesson === lesson.id ? null : lesson.id)
                      }
                    />
                    <IconButton
                      label={labels.delete}
                      icon="trash"
                      danger
                      onClick={() => deleteLesson(lesson.id)}
                    />
                  </div>
                </div>

                {editingLesson === lesson.id && (
                  <LessonEditor
                    courseId={courseId}
                    lesson={lesson}
                    locale={locale}
                    labels={labels}
                    onChange={(patch) => updateLesson(lesson.id, patch)}
                    onClose={() => setEditingLesson(null)}
                  />
                )}
              </li>
            ))}

            {module.lessons.length === 0 && (
              <li
                className="px-3 py-4 text-center text-[12px] text-ink-subtle"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropLesson(module.id, 0)}
              >
                {labels.noLessons}
              </li>
            )}
          </ul>

          <div className="flex flex-wrap gap-1.5 border-t border-line bg-surface-muted px-3 py-2">
            {LESSON_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                disabled={busy === module.id}
                onClick={() => addLesson(module.id, type.value)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
              >
                <Icon name={type.icon} size={13} />
                {label(type)}
              </button>
            ))}
          </div>
        </div>
      ))}

      {modules.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-muted">{labels.noModules}</p>
          <Button className="mt-4" onClick={addModule} loading={busy === "module"}>
            <Icon name="plus" size={15} />
            {labels.addModule}
          </Button>
        </Card>
      )}
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30",
        danger
          ? "text-ink-subtle hover:bg-danger-50 hover:text-danger-700"
          : "text-ink-subtle hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

/** Inline editor for one lesson, including its media upload. */
function LessonEditor({
  courseId,
  lesson,
  locale,
  labels,
  onChange,
  onClose,
}: {
  courseId: string;
  lesson: EditorLesson;
  locale: Locale;
  labels: Record<string, string>;
  onChange: (patch: Partial<EditorLesson>) => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function upload(file: File, kind: "video" | "pdf" | "captions") {
    setUploading(true);
    setUploadError(null);
    setProgress(0);

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("courseId", courseId);
      form.set("lessonId", lesson.id);

      // XHR rather than fetch: video uploads are large and a progress bar is
      // the difference between "working" and "frozen".
      const result = await new Promise<{ key: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/uploads");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              reject(new Error(JSON.parse(xhr.responseText).error?.message ?? "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(form);
      });

      if (kind !== "captions") onChange({ assetKey: result.key });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const acceptFor = (kind: "video" | "pdf" | "captions") =>
    kind === "video"
      ? "video/mp4,video/webm,video/quicktime"
      : kind === "pdf"
        ? "application/pdf"
        : ".vtt,.srt,text/vtt";

  return (
    <div className="border-t border-line bg-surface-muted p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.lessonTitle} className="sm:col-span-2">
          <Input
            value={lesson.title}
            onChange={(e) => onChange({ title: e.target.value })}
            maxLength={180}
          />
        </Field>

        <Field label={labels.lessonType}>
          <Select value={lesson.type} onChange={(e) => onChange({ type: e.target.value })}>
            {LESSON_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {locale === "en" ? type.labelEn : type.labelKa}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={labels.duration} hint={labels.durationHint}>
          <Input
            type="number"
            min={0}
            value={Math.round(lesson.durationSeconds / 60)}
            onChange={(e) => onChange({ durationSeconds: Number(e.target.value) * 60 })}
          />
        </Field>

        <Field label={labels.lessonDescription} className="sm:col-span-2">
          <Textarea
            value={lesson.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
            maxLength={4000}
          />
        </Field>

        {lesson.type === "TEXT" && (
          <Field label={labels.textContent} className="sm:col-span-2">
            <Textarea
              value={lesson.textContent ?? ""}
              onChange={(e) => onChange({ textContent: e.target.value })}
              rows={8}
              maxLength={100_000}
            />
          </Field>
        )}

        {(lesson.type === "VIDEO" || lesson.type === "PDF") && (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-semibold text-ink">
              {lesson.type === "VIDEO" ? labels.videoFile : labels.pdfFile}
            </p>

            {lesson.assetKey ? (
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-2.5 py-1.5 text-[12px] font-medium text-success-700">
                <Icon name="check" size={13} />
                {labels.uploaded}
              </p>
            ) : (
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-warn-50 px-2.5 py-1.5 text-[12px] font-medium text-warn-700">
                <Icon name="alert" size={13} />
                {labels.noContent}
              </p>
            )}

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted">
              <Icon name="upload" size={15} />
              {uploading ? `${progress}%` : lesson.assetKey ? labels.replaceFile : labels.uploadFile}
              <input
                type="file"
                className="hidden"
                accept={acceptFor(lesson.type === "VIDEO" ? "video" : "pdf")}
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, lesson.type === "VIDEO" ? "video" : "pdf");
                }}
              />
            </label>

            {lesson.type === "VIDEO" && (
              <label className="ms-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted">
                <Icon name="file" size={15} />
                {labels.captions}
                <input
                  type="file"
                  className="hidden"
                  accept={acceptFor("captions")}
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file, "captions");
                  }}
                />
              </label>
            )}

            {uploading && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-[12px] font-medium text-danger-700">{uploadError}</p>
            )}
          </div>
        )}

        {lesson.type === "QUIZ" && (
          <div className="sm:col-span-2">
            <QuizEditorLink lessonId={lesson.id} label={labels.editQuiz} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-muted">
            <Checkbox
              checked={lesson.isFreePreview}
              onChange={(e) => onChange({ isFreePreview: e.target.checked })}
            />
            {labels.freePreview}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-muted">
            <Checkbox
              checked={lesson.isPublished}
              onChange={(e) => onChange({ isPublished: e.target.checked })}
            />
            {labels.visible}
          </label>

          <Button className="ms-auto" size="sm" variant="ghost" onClick={onClose}>
            {labels.done}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizEditorLink({ lessonId, label }: { lessonId: string; label: string }) {
  return (
    <a
      href={`#quiz-${lessonId}`}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
      onClick={(e) => {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("open-quiz-editor", { detail: { lessonId } }));
      }}
    >
      <Icon name="edit" size={14} />
      {label}
    </a>
  );
}
