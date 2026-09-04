"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Checkbox, Field, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

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
  const [accountType, setAccountType] = useState<"STUDENT" | "CREATOR">(
    params.get("type") === "creator" ? "CREATOR" : "STUDENT",
  );
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

      <fieldset>
        <legend className="mb-2 block text-[13px] font-semibold text-ink">
          {labels.accountType}
        </legend>
        <div className="grid grid-cols-2 gap-2.5">
          <TypeOption
            selected={accountType === "STUDENT"}
            onSelect={() => setAccountType("STUDENT")}
            icon="book"
            title={labels.asStudent}
            hint={labels.asStudentHint}
          />
          <TypeOption
            selected={accountType === "CREATOR"}
            onSelect={() => setAccountType("CREATOR")}
            icon="sparkles"
            title={labels.asCreator}
            hint={labels.asCreatorHint}
          />
        </div>
      </fieldset>

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

function TypeOption({
  selected,
  onSelect,
  icon,
  title,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: "book" | "sparkles";
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
        selected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
          : "border-line-strong bg-surface hover:border-brand-200 hover:bg-surface-muted",
      )}
    >
      <span className={cn("inline-flex", selected ? "text-brand-600" : "text-ink-subtle")}>
        <Icon name={icon} size={19} />
      </span>
      <span className={cn("text-sm font-semibold", selected ? "text-brand-800" : "text-ink")}>
        {title}
      </span>
      <span className="text-[11px] leading-tight text-ink-subtle">{hint}</span>
    </button>
  );
}
