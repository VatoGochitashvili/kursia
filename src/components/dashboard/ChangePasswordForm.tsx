"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input } from "@/components/ui/primitives";

export function ChangePasswordForm({ labels }: { labels: Record<string, string> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setDone(false);

    const form = new FormData(event.currentTarget);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: String(form.get("currentPassword") ?? ""),
        newPassword: String(form.get("newPassword") ?? ""),
      });
      setDone(true);
      event.currentTarget.reset();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      {done && <Alert tone="success">{labels.changed}</Alert>}

      <Field label={labels.current} error={fieldError(error, "currentPassword")}>
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={labels.next} hint={labels.hint} error={fieldError(error, "newPassword")}>
        <Input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
      </Field>

      <Button type="submit" size="sm" loading={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
