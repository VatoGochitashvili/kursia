"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface Result {
  ok: boolean;
  driver: string;
  error?: string;
  to: string;
}

/**
 * Sends one real message to the administrator's own address and prints what
 * the mail server said back — the only way to know email works before a
 * member needs a password reset.
 */
export function EmailTestButton({
  labels,
}: {
  labels: { send: string; sent: string; failed: string };
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      setResult(await api.post<Result>("/api/admin/email-test", {}));
    } catch (err) {
      setResult({ ok: false, driver: "—", error: errorMessage(err), to: "" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button variant="outline" size="sm" loading={pending} onClick={run} className="w-fit">
        <Icon name="send" size={15} />
        {labels.send}
      </Button>
      {result && (
        <p
          className={`text-[13px] leading-relaxed ${result.ok ? "text-success-700" : "text-danger-700"}`}
        >
          {result.ok ? `${labels.sent} ${result.to} (${result.driver})` : `${labels.failed} ${result.error ?? ""}`}
        </p>
      )}
    </div>
  );
}
