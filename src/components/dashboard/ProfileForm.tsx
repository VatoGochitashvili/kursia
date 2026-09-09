"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { MediaUploader, type UploaderLabels } from "@/components/ui/MediaUploader";
import { useToast } from "@/components/ui/Toast";

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
  uploaderLabels,
}: {
  initial: ProfileValues;
  labels: Record<string, string>;
  uploaderLabels: UploaderLabels;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

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
      toast.show(labels.saved, "success");
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }


  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      {saved && <Alert tone="success">{labels.saved}</Alert>}

      <Card className="p-5">
        <h2 className="mb-4 text-lg">{labels.publicProfile}</h2>

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar src={values.avatarUrl || null} name={values.fullName || "?"} size={80} />
          <MediaUploader
            kind="avatar"
            preview="image"
            value={values.avatarUrl || null}
            valueLabel={labels.currentPhoto}
            onUploaded={(result) => set("avatarUrl", result.url ?? "")}
            onRemove={() => set("avatarUrl", "")}
            labels={uploaderLabels}
            icon="camera"
            compact
            className="flex-1"
          />
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
