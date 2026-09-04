"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input } from "@/components/ui/primitives";

export function LoginForm({
  labels,
  forgotHref,
}: {
  labels: Record<string, string>;
  forgotHref: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const result = await api.post<{ redirectTo: string }>("/api/auth/login", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      // Honour ?next= so a login prompt returns the user where they were,
      // but only for same-site paths — never an absolute URL.
      const next = params.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : result.redirectTo;
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <Field label={labels.email} error={fieldError(error, "email")}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.ge"
          dir="ltr"
        />
      </Field>

      <Field label={labels.password} error={fieldError(error, "password")}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <div className="flex justify-end">
        <Link href={forgotHref} className="text-[13px] font-medium text-brand-600 hover:underline">
          {labels.forgot}
        </Link>
      </div>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
