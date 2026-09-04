"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/**
 * Refund request.
 *
 * This only files a request — it never moves money or revokes access. An
 * administrator reviews it, and processing runs through the same ledger-aware
 * path as any other refund.
 */
export function RefundRequestButton({
  purchaseId,
  labels,
}: {
  purchaseId: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await api.post("/api/refunds", { purchaseId, reason: reason.trim() });
      setSent(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  if (sent) return <Alert tone="success">{labels.sent}</Alert>;

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Icon name="refresh" size={14} />
        {labels.request}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      <Field label={labels.reason} hint={labels.hint}>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={2000}
          autoFocus
        />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" loading={pending} disabled={reason.trim().length < 10} onClick={submit}>
          {labels.submit}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
