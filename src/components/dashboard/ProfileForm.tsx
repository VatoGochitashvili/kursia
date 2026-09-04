"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export interface ProfileValues {
  fullName: string;
  username: string;
  headline: string;
  bio: string;
  city: string;
  phone: string;
  avatarUrl: string;
  websiteUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
}

export function ProfileForm({
  initial,
  labels,
}: {
  initial: ProfileValues;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch("/api/profile", values);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "avatar");
      const result = await api.upload<{ url: string }>("/api/uploads", form);
      set("avatarUrl", result.url);
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      {saved && <Alert tone="success">{labels.saved}</Alert>}

      <Card className="p-5">
        <h2 className="mb-4 text-lg">{labels.publicProfile}</h2>

        <div className="mb-5 flex flex-wrap items-center gap-4">
          <Avatar src={values.avatarUrl || null} name={values.fullName || "?"} size={72} />
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted">
              <Icon name="upload" size={15} />
              {uploading ? labels.uploading : labels.changePhoto}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
            </label>
            <p className="mt-1.5 text-[11px] text-ink-subtle">{labels.photoHint}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.fullName} error={fieldError(error, "fullName")}>
            <Input value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field
            label={labels.username}
            hint={labels.usernameHint}
            error={fieldError(error, "username")}
          >
            <Input
              value={values.username}
              onChange={(e) => set("username", e.target.value.toLowerCase())}
              dir="ltr"
            />
          </Field>
        </div>

        <Field className="mt-4" label={labels.headline} error={fieldError(error, "headline")}>
          <Input
            value={values.headline}
            onChange={(e) => set("headline", e.target.value)}
            maxLength={160}
          />
        </Field>

        <Field className="mt-4" label={labels.bio} error={fieldError(error, "bio")}>
          <Textarea
            value={values.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={4}
            maxLength={2000}
          />
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={labels.city}>
            <Input value={values.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label={labels.phone}>
            <Input
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              dir="ltr"
              inputMode="tel"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-lg">{labels.socialLinks}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["websiteUrl", "Website"],
              ["linkedinUrl", "LinkedIn"],
              ["facebookUrl", "Facebook"],
              ["youtubeUrl", "YouTube"],
              ["instagramUrl", "Instagram"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} error={fieldError(error, key)}>
              <Input
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder="https://"
                dir="ltr"
                type="url"
              />
            </Field>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {labels.save}
        </Button>
      </div>
    </form>
  );
}
