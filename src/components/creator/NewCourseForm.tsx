"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Field, Input, Select } from "@/components/ui/primitives";

export interface CategoryOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

export function NewCourseForm({
  categories,
  labels,
}: {
  categories: CategoryOption[];
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
    const categoryId = String(form.get("categoryId") ?? "");

    try {
      const course = await api.post<{ redirectTo: string }>("/api/courses", {
        title: String(form.get("title") ?? ""),
        ...(categoryId ? { categoryId } : {}),
        language: String(form.get("language") ?? "ka"),
      });
      router.push(course.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <Field label={labels.title} hint={labels.titleHint} error={fieldError(error, "title")} required>
        <Input name="title" required minLength={5} maxLength={140} autoFocus />
      </Field>

      <Field label={labels.category} error={fieldError(error, "categoryId")}>
        <Select name="categoryId" defaultValue="">
          <option value="">{labels.selectCategory}</option>
          {categories.map((category) => (
            <optgroup key={category.id} label={category.name}>
              <option value={category.id}>{category.name}</option>
              {category.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {"— "}
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <Field label={labels.language}>
        <Select name="language" defaultValue="ka">
          <option value="ka">ქართული</option>
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </Select>
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
