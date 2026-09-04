"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/primitives";

/**
 * Stand-in for a bank's hosted payment page.
 *
 * The buttons do NOT grant anything. They ask the dev-only settle endpoint to
 * deliver a *signed* callback to our webhook, exactly as a real acquirer
 * would; the webhook then decides the outcome.
 */
export function SandboxTerminal({
  order,
  reference,
  labels,
}: {
  order: string;
  reference: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function settle(outcome: "success" | "fail" | "cancel") {
    setPending(outcome);
    setError(null);
    try {
      await api.post("/api/dev/sandbox-settle", { order, outcome });
      router.push(
        outcome === "cancel"
          ? `/checkout/${reference}/cancelled`
          : `/checkout/${reference}/complete`,
      );
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <Button size="lg" fullWidth loading={pending === "success"} onClick={() => settle("success")}>
        {labels.approve}
      </Button>
      <Button
        variant="outline"
        size="lg"
        fullWidth
        loading={pending === "fail"}
        onClick={() => settle("fail")}
      >
        {labels.decline}
      </Button>
      <Button
        variant="ghost"
        size="md"
        fullWidth
        loading={pending === "cancel"}
        onClick={() => settle("cancel")}
      >
        {labels.cancel}
      </Button>
    </div>
  );
}
