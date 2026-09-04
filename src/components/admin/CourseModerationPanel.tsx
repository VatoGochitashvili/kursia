"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/**
 * Admin moderation controls for one course.
 *
 * Rejections and change-requests force a reason: the creator sees that text
 * verbatim, and "rejected, no explanation" is the fastest way to lose them.
 */
export function CourseModerationPanel({
  courseId,
  courseSlug,
  status,
  isFeatured,
  labels,
}: {
  courseId: string;
  courseSlug: string;
  status: string;
  isFeatured: boolean;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [reasonFor, setReasonFor] = useState<"REJECTED" | "CHANGES_REQUESTED" | null>(null);
  const [reason, setReason] = useState("");

  async function transition(to: string, note?: string) {
    setPending(to);
    setError(null);
    try {
      await api.post(`/api/courses/${courseId}/status`, { to, ...(note ? { note } : {}) });
      setReasonFor(null);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  async function toggleFeatured() {
    setPending("feature");
    setError(null);
    try {
      await api.post("/api/admin/moderation", {
        targetType: "COURSE",
        targetId: courseId,
        action: isFeatured ? "UNFEATURE" : "FEATURE",
      });
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  const inReview = status === "SUBMITTED" || status === "UNDER_REVIEW";

  return (
    <div className="w-full sm:w-auto sm:min-w-56">
      {error != null && (
        <Alert tone="danger" className="mb-2">
          {errorMessage(error)}
        </Alert>
      )}

      {reasonFor ? (
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={labels.reason}
            rows={3}
            maxLength={2000}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={reasonFor === "REJECTED" ? "danger" : "primary"}
              loading={pending === reasonFor}
              disabled={!reason.trim()}
              onClick={() => transition(reasonFor, reason.trim())}
            >
              {labels.submit}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>
              {labels.cancel}
            </Button>
          </div>
          {!reason.trim() && (
            <p className="text-[11px] text-ink-subtle">{labels.reasonRequired}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {status === "SUBMITTED" && (
            <Button
              size="sm"
              variant="outline"
              loading={pending === "UNDER_REVIEW"}
              onClick={() => transition("UNDER_REVIEW")}
            >
              {labels.review}
            </Button>
          )}

          {inReview && (
            <>
              <Button
                size="sm"
                variant="success"
                loading={pending === "APPROVED"}
                onClick={() => transition("APPROVED")}
              >
                <Icon name="check" size={14} />
                {labels.approve}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReasonFor("CHANGES_REQUESTED")}
              >
                {labels.requestChanges}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReasonFor("REJECTED")}>
                {labels.reject}
              </Button>
            </>
          )}

          {status === "APPROVED" && (
            <Button
              size="sm"
              loading={pending === "PUBLISHED"}
              onClick={() => transition("PUBLISHED")}
            >
              <Icon name="globe" size={14} />
              {labels.publish}
            </Button>
          )}

          {status === "PUBLISHED" && (
            <>
              <Button
                size="sm"
                variant={isFeatured ? "outline" : "secondary"}
                loading={pending === "feature"}
                onClick={toggleFeatured}
              >
                <Icon name="star" size={14} filled={isFeatured} />
                {isFeatured ? labels.unfeature : labels.feature}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={pending === "UNPUBLISHED"}
                onClick={() => transition("UNPUBLISHED")}
              >
                {labels.unpublish}
              </Button>
            </>
          )}

          <Link
            href={`/courses/${courseSlug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Icon name="eye" size={14} />
            {labels.preview}
          </Link>
        </div>
      )}
    </div>
  );
}
