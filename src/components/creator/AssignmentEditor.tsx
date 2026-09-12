"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Checkbox, Field, Input, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import type { Dictionary } from "@/i18n";

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  allowFileUpload: boolean;
  maxPoints: number;
}

/**
 * The brief on an ASSIGNMENT lesson.
 *
 * Saved on its own rather than with the rest of the lesson form: a lesson has
 * at most one assignment and the endpoint upserts, so there is nothing to
 * reconcile between the two saves. It also means the submissions a student
 * has already sent are never touched by an edit to the lesson title.
 */
export function AssignmentEditor({
  lessonId,
  t,
}: {
  lessonId: string;
  t: Dictionary;
}) {
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [allowFileUpload, setAllowFileUpload] = useState(true);
  const [maxPoints, setMaxPoints] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ assignment: Assignment | null }>(
        `/api/lessons/${lessonId}/assignment`,
      );
      if (data.assignment) {
        setAssignment(data.assignment);
        setTitle(data.assignment.title);
        setInstructions(data.assignment.instructions);
        setAllowFileUpload(data.assignment.allowFileUpload);
        setMaxPoints(String(data.assignment.maxPoints));
      }
    } catch {
      // A missing assignment is the normal state for a new lesson.
    } finally {
      setLoaded(true);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await api.put<{ assignment: Assignment }>(
        `/api/lessons/${lessonId}/assignment`,
        {
          title: title.trim(),
          instructions: instructions.trim(),
          allowFileUpload,
          maxPoints: Number(maxPoints) || 100,
        },
      );
      setAssignment(result.assignment);
      toast.show(t.common.saved, "success");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="skeleton h-24 rounded-xl sm:col-span-2" />;
  }

  return (
    <div className="sm:col-span-2 rounded-2xl border border-line bg-surface-muted/50 p-4">
      <p className="mb-3 text-[13px] font-semibold text-ink">{t.creator.assignmentBrief}</p>

      {error != null && (
        <Alert tone="danger" className="mb-3">
          {errorMessage(error)}
        </Alert>
      )}

      <Field label={t.creator.assignmentTitle} error={fieldError(error, "title")}>
        <Input
          value={title}
          placeholder={t.creator.assignmentTitlePlaceholder}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field
        className="mt-3"
        label={t.creator.assignmentInstructions}
        hint={t.creator.assignmentInstructionsHint}
        error={fieldError(error, "instructions")}
      >
        <Textarea
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </Field>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <Field label={t.creator.assignmentMaxPoints} className="w-28">
          <Input
            type="number"
            min={1}
            max={1000}
            value={maxPoints}
            onChange={(e) => setMaxPoints(e.target.value)}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 pb-2.5 text-[13px] text-ink-muted">
          <Checkbox
            checked={allowFileUpload}
            onChange={(e) => setAllowFileUpload(e.target.checked)}
          />
          {t.creator.assignmentAllowFile}
        </label>

        <Button
          className="ms-auto"
          size="md"
          loading={saving}
          disabled={!title.trim() || !instructions.trim()}
          onClick={save}
        >
          <Icon name="check" size={15} />
          {assignment ? t.common.save : t.common.create}
        </Button>
      </div>
    </div>
  );
}
