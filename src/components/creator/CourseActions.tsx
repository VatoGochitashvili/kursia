"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

export interface CourseActionLabels {
  delete: string;
  deleteTitle: string;
  /** Shown when the course has no enrolments — it really is destroyed. */
  deleteBody: string;
  /** Shown when students are enrolled — it is archived instead. */
  archiveTitle: string;
  archiveBody: string;
  confirmDelete: string;
  confirmArchive: string;
  cancel: string;
  deleted: string;
  archived: string;
}

/**
 * Delete (or archive) a course.
 *
 * The distinction is not cosmetic and is decided by the server: a course with
 * enrolments is archived, never destroyed, because deleting it would take
 * away content students have paid for. The dialog says which of the two is
 * about to happen so the creator is never surprised by the outcome — the
 * count comes from the same row the list already rendered.
 */
export function CourseActions({
  courseId,
  studentCount,
  labels,
  redirectTo,
}: {
  courseId: string;
  studentCount: number;
  labels: CourseActionLabels;
  /** Where to go afterwards. Omit to just refresh the current list. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const willArchive = studentCount > 0;

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await api.delete<{ archived?: boolean; deleted?: boolean }>(
        `/api/courses/${courseId}`,
      );
      // The server decides which of the two happened; report what it did
      // rather than what was requested.
      toast.show(result.archived ? labels.archived : labels.deleted, "success");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="text-danger-700 hover:bg-danger-50"
      >
        <Icon name="trash" size={14} />
        {labels.delete}
      </Button>

      <ConfirmDialog
        open={open}
        pending={pending}
        icon="trash"
        title={willArchive ? labels.archiveTitle : labels.deleteTitle}
        body={
          <>
            <p>{willArchive ? labels.archiveBody : labels.deleteBody}</p>
            {error && (
              <Alert tone="danger" className="mt-3">
                {error}
              </Alert>
            )}
          </>
        }
        confirmLabel={willArchive ? labels.confirmArchive : labels.confirmDelete}
        cancelLabel={labels.cancel}
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
