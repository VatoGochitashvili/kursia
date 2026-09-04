"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input, Textarea } from "@/components/ui/primitives";

/**
 * Self-service upgrade from student to creator.
 *
 * Creating the profile is instant; *verification* (the blue check) stays an
 * editorial decision an administrator makes, and course publishing still goes
 * through moderation.
 */
export function BecomeCreatorForm({
  defaultName,
  labels,
}: {
  defaultName: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const result = await api.post<{ redirectTo: string }>("/api/profile", {
        displayName: String(form.get("displayName") ?? ""),
        ...(form.get("instructorBio")
          ? { instructorBio: String(form.get("instructorBio")) }
          : {}),
      });
      router.push(result.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <Field label={labels.displayName} error={fieldError(error, "displayName")}>
        <Input name="displayName" defaultValue={defaultName} required minLength={2} />
      </Field>
      <Field label={labels.bio}>
        <Textarea name="instructorBio" rows={3} maxLength={4000} />
      </Field>

      <Button type="submit" size="sm" fullWidth loading={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
