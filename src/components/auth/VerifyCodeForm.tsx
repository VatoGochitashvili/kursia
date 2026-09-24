"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input } from "@/components/ui/primitives";

/**
 * The six digits from the confirmation email.
 *
 * The code is prefilled when somebody arrived by clicking the link in that
 * email, so the common path is one button; typing it by hand is the fallback
 * for a phone reading the mail and a laptop holding the session.
 */
export function VerifyCodeForm({
  email,
  labels,
}: {
  email: string;
  labels: {
    label: string;
    submit: string;
    resend: string;
    resent: string;
    done: string;
    continue: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const next = (() => {
    const raw = params.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard/profile";
  })();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.post("/api/auth/verify-email", { email, code: code.trim() });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setError(null);
    try {
      await api.post("/api/auth/resend-verification", {});
      setResent(true);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <Alert tone="success">{labels.done}</Alert>
        <Button size="lg" fullWidth onClick={() => router.push(next)}>
          {labels.continue}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      {resent && <Alert tone="success">{labels.resent}</Alert>}

      <Field label={labels.label} required>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="text-center text-[24px] font-bold tracking-[0.5em]"
        />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending} disabled={code.length !== 6}>
        {labels.submit}
      </Button>

      <button
        type="button"
        onClick={resend}
        className="text-[13px] font-semibold text-brand-600 hover:underline"
      >
        {labels.resend}
      </button>
    </form>
  );
}
