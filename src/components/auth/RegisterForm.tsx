"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Checkbox, Field, Input } from "@/components/ui/primitives";

export function RegisterForm({
  labels,
  locale,
}: {
  labels: Record<string, string>;
  locale: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  // ?type=creator lets the "become an instructor" CTAs land on the right choice.
  // There is one kind of account. The flag survives only to decide where
  // somebody lands after signing up: a person who arrived from "start your
  // circle" goes on to the plans instead of the dashboard.
  const accountType: "STUDENT" | "CREATOR" =
    params.get("type") === "creator" ? "CREATOR" : "STUDENT";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const result = await api.post<{ redirectTo: string }>("/api/auth/register", {
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        accountType,
        ...(accountType === "CREATOR" && form.get("displayName")
          ? { displayName: String(form.get("displayName")) }
          : {}),
        locale,
        acceptTerms: form.get("acceptTerms") === "on",
      });
      router.push(result.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <Field label={labels.fullName} error={fieldError(error, "fullName")} required>
        <Input name="fullName" autoComplete="name" required placeholder="გიორგი ხუციშვილი" />
      </Field>

      {accountType === "CREATOR" && (
        <Field
          label={labels.displayName}
          hint={labels.displayNameHint}
          error={fieldError(error, "displayName")}
        >
          <Input name="displayName" autoComplete="nickname" />
        </Field>
      )}

      <Field label={labels.email} error={fieldError(error, "email")} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.ge"
          dir="ltr"
        />
      </Field>

      <Field
        label={labels.password}
        hint={labels.passwordHint}
        error={fieldError(error, "password")}
        required
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-muted">
        <Checkbox name="acceptTerms" required className="mt-0.5" />
        <span>{labels.acceptTerms}</span>
      </label>
      {fieldError(error, "acceptTerms") && (
        <p className="text-[12px] font-medium text-danger-700">{fieldError(error, "acceptTerms")}</p>
      )}

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}

