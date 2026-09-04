"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input } from "@/components/ui/primitives";

export function ForgotPasswordForm({ labels }: { labels: Record<string, string> }) {
  const [state, setState] = useState<"idle" | "pending" | "sent">("idle");
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("pending");
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api.post("/api/auth/forgot-password", { email: String(form.get("email") ?? "") });
      setState("sent");
    } catch (err) {
      setError(err);
      setState("idle");
    }
  }

  // The confirmation is intentionally non-committal: it never reveals whether
  // the address has an account.
  if (state === "sent") {
    return <Alert tone="success">{labels.sent}</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      <Field label={labels.email} error={fieldError(error, "email")}>
        <Input name="email" type="email" autoComplete="email" required dir="ltr" />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={state === "pending"}>
        {labels.submit}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ labels }: { labels: Record<string, string> }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("pending");
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password: String(form.get("password") ?? ""),
      });
      setState("done");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err);
      setState("idle");
    }
  }

  if (!token) return <Alert tone="danger">{labels.invalidToken}</Alert>;
  if (state === "done") return <Alert tone="success">{labels.changed}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      <Field label={labels.newPassword} hint={labels.passwordHint} error={fieldError(error, "password")}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={state === "pending"}>
        {labels.submit}
      </Button>
    </form>
  );
}

export function VerifyEmailPanel({ labels }: { labels: Record<string, string> }) {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"idle" | "pending" | "ok" | "fail">("idle");

  async function verify() {
    if (!token) return;
    setState("pending");
    try {
      await api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      setState("ok");
    } catch {
      setState("fail");
    }
  }

  // Verification is a POST-like side effect, so it runs on an explicit click
  // rather than on render — email scanners and prefetchers must not consume
  // the token before the user sees the page.
  if (!token) return <Alert tone="warn">{labels.checkInbox}</Alert>;
  if (state === "ok") return <Alert tone="success">{labels.verified}</Alert>;
  if (state === "fail") return <Alert tone="danger">{labels.invalidToken}</Alert>;

  return (
    <Button size="lg" fullWidth loading={state === "pending"} onClick={verify}>
      {labels.confirm}
    </Button>
  );
}
