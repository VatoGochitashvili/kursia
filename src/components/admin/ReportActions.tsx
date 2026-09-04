"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Textarea } from "@/components/ui/primitives";

/** Resolve a user report as actioned or dismissed, with a written outcome. */
export function ReportActions({
  reportId,
  labels,
}: {
  reportId: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "ACTIONED" | "DISMISSED">("idle");
  const [resolution, setResolution] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(status: "ACTIONED" | "DISMISSED") {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/admin/reports/${reportId}`, {
        status,
        resolution: resolution.trim() || undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setMode("ACTIONED")}>
          {labels.action}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("DISMISSED")}>
          {labels.dismiss}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 space-y-2">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      <Textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder={labels.resolution}
        rows={2}
        maxLength={1000}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" loading={pending} onClick={() => submit(mode)}>
          {labels.submit}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
