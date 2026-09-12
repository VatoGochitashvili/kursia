"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Field, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { fill } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

/**
 * Deleting a course.
 *
 * This used to be a button on every row of the course list, one click and a
 * confirm away from destroying months of work. It now lives at the bottom of
 * the last settings tab, behind a collapsed panel, and asks for the course
 * title to be typed exactly.
 *
 * Typing the name is not ceremony. A confirm dialog is dismissed by reflex —
 * people click the primary button because it is the primary button. Copying a
 * title out is the cheapest way to make someone read what they are about to
 * destroy, and it is the one interaction a mis-click cannot complete.
 *
 * The server decides the outcome, not this component: a course with enrolments
 * is archived rather than deleted, because students paid for it. The panel
 * says which will happen so nobody is surprised either way.
 */
export function DangerZone({
  courseId,
  courseTitle,
  studentCount,
  redirectTo,
  t,
}: {
  courseId: string;
  courseTitle: string;
  studentCount: number;
  redirectTo: string;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const willArchive = studentCount > 0;
  // Compared after trimming only. Case and inner spacing must match, so this
  // cannot be satisfied by an approximation of the title.
  const confirmed = typed.trim() === courseTitle.trim();

  async function destroy() {
    if (!confirmed) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.delete<{ archived?: boolean; deleted?: boolean }>(
        `/api/courses/${courseId}`,
      );
      toast.show(
        result.archived ? t.creator.courseArchived : t.creator.courseDeleted,
        "success",
      );
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <Card className="border-danger-500/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base text-danger-700">
            <Icon name="alert" size={18} />
            {t.creator.dangerZone}
          </h2>
          <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-muted">
            {willArchive ? t.creator.archiveCourseBody : t.creator.deleteCourseBody}
          </p>
        </div>

        {!open && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-danger-500/40 text-danger-700 hover:bg-danger-50"
            onClick={() => setOpen(true)}
          >
            {willArchive ? t.creator.archiveCourse : t.creator.deleteCourse}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-5 animate-fade-up border-t border-danger-500/20 pt-5">
          {error && (
            <Alert tone="danger" className="mb-4">
              {error}
            </Alert>
          )}

          <Field
            label={fill(t.creator.deleteConfirmLabel, { title: courseTitle })}
            hint={t.creator.deleteConfirmHint}
          >
            <Input
              value={typed}
              autoComplete="off"
              spellCheck={false}
              placeholder={courseTitle}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              variant="danger"
              loading={pending}
              disabled={!confirmed}
              onClick={destroy}
            >
              <Icon name="trash" size={16} />
              {willArchive ? t.creator.confirmArchiveCourse : t.creator.confirmDeleteCourse}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
            >
              {t.common.cancel}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
