"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input, Textarea } from "@/components/ui/primitives";

type Action = "APPROVE" | "REJECT" | "MARK_PROCESSING" | "MARK_PAID" | "MARK_FAILED";

/**
 * Payout lifecycle controls.
 *
 * "Mark as paid" asks for the bank reference before it commits, because that
 * is the step that actually debits the creator's balance — it needs a paper
 * trail, and the ledger entry records it.
 */
export function PayoutActions({
  payoutId,
  status,
  labels,
}: {
  payoutId: string;
  status: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [providerRef, setProviderRef] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function run(action: Action) {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/admin/payouts/${payoutId}`, {
        action,
        ...(providerRef.trim() ? { providerRef: providerRef.trim() } : {}),
        ...(note.trim() ? { adminNote: note.trim() } : {}),
      });
      setConfirming(null);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  if (["PAID", "REJECTED", "FAILED"].includes(status)) return null;

  if (confirming) {
    return (
      <div className="w-64 space-y-3 text-start">
        {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

        {confirming === "MARK_PAID" && (
          <Field label={labels.providerRef}>
            <Input
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </Field>
        )}

        <Field label={labels.note}>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
          />
        </Field>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={confirming === "REJECT" || confirming === "MARK_FAILED" ? "danger" : "primary"}
            loading={pending}
            onClick={() => run(confirming)}
          >
            {labels.submit}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {status === "REQUESTED" && (
        <>
          <Button size="sm" loading={pending} onClick={() => run("APPROVE")}>
            {labels.approve}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming("REJECT")}>
            {labels.reject}
          </Button>
        </>
      )}

      {status === "APPROVED" && (
        <Button size="sm" variant="outline" loading={pending} onClick={() => run("MARK_PROCESSING")}>
          {labels.processing}
        </Button>
      )}

      {(status === "APPROVED" || status === "PROCESSING") && (
        <>
          <Button size="sm" variant="success" onClick={() => setConfirming("MARK_PAID")}>
            {labels.paid}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming("MARK_FAILED")}>
            {labels.failed}
          </Button>
        </>
      )}
    </div>
  );
}
