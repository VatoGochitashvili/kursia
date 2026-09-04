"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Checkbox, Field, Input, Textarea } from "@/components/ui/primitives";

/**
 * Approve or reject one refund.
 *
 * Approval opens a form rather than firing immediately: the amount can be
 * reduced, and whether access is revoked is a real decision (a goodwill
 * partial refund usually should not remove the course).
 */
export function RefundActions({
  refundId,
  maxAmount,
  defaultAmount,
  currency,
  labels,
}: {
  refundId: string;
  maxAmount: number;
  defaultAmount: number;
  currency: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [revokeAccess, setRevokeAccess] = useState(true);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(action: "APPROVE" | "REJECT") {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/admin/refunds/${refundId}`, {
        action,
        ...(action === "APPROVE" ? { amount, revokeAccess } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-1.5">
        <Button size="sm" variant="success" onClick={() => setMode("approve")}>
          {labels.approve}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("reject")}>
          {labels.reject}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 space-y-3 text-start">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      {mode === "approve" && (
        <>
          <Field label={`${labels.amount} (${currency})`}>
            <Input
              type="number"
              min={0}
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-muted">
            <Checkbox
              checked={revokeAccess}
              onChange={(e) => setRevokeAccess(e.target.checked)}
            />
            {labels.revokeAccess}
          </label>
        </>
      )}

      <Field label={labels.note}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} />
      </Field>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "approve" ? "success" : "danger"}
          loading={pending}
          onClick={() => submit(mode === "approve" ? "APPROVE" : "REJECT")}
        >
          {labels.submit}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
