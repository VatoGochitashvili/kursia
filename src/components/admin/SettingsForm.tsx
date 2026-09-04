"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

interface SettingsValues {
  platformName: string;
  platformNameKa: string;
  taglineKa: string;
  taglineEn: string;
  logoUrl: string;
  supportEmail: string;
  currency: string;
  commissionPercent: string;
  payoutClearingDays: string;
  payoutMinimum: string;
  refundWindowDays: string;
  courseApprovalRequired: boolean;
  registrationOpen: boolean;
  creatorRegistrationOpen: boolean;
  creatorAutoApprove: boolean;
  seoDefaultTitleKa: string;
  seoDefaultDescriptionKa: string;
  paymentProviders: string[];
  defaultPaymentProvider: string;
}

interface ProviderOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  manualSettlement: boolean;
}

/**
 * Platform settings.
 *
 * Everything here is live configuration — renaming the platform, changing the
 * commission or closing registration takes effect on the next request. The
 * commission note is deliberate: changing it must not rewrite historic orders,
 * and the copy says so.
 */
export function SettingsForm({
  initial,
  availableProviders,
  locale,
  labels,
}: {
  initial: SettingsValues;
  availableProviders: ProviderOption[];
  locale: Locale;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const set = <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  function toggleProvider(id: string) {
    const next = values.paymentProviders.includes(id)
      ? values.paymentProviders.filter((p) => p !== id)
      : [...values.paymentProviders, id];
    set("paymentProviders", next);
    // Never leave the default pointing at a disabled provider.
    if (!next.includes(values.defaultPaymentProvider) && next.length > 0) {
      set("defaultPaymentProvider", next[0]!);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.patch("/api/admin/settings", {
        platformName: values.platformName,
        platformNameKa: values.platformNameKa,
        taglineKa: values.taglineKa,
        taglineEn: values.taglineEn,
        logoUrl: values.logoUrl,
        supportEmail: values.supportEmail,
        currency: values.currency,
        commissionPercent: Number(values.commissionPercent),
        payoutClearingDays: Number(values.payoutClearingDays),
        payoutMinimum: values.payoutMinimum,
        refundWindowDays: Number(values.refundWindowDays),
        courseApprovalRequired: values.courseApprovalRequired,
        registrationOpen: values.registrationOpen,
        creatorRegistrationOpen: values.creatorRegistrationOpen,
        creatorAutoApprove: values.creatorAutoApprove,
        seoDefaultTitleKa: values.seoDefaultTitleKa,
        seoDefaultDescriptionKa: values.seoDefaultDescriptionKa,
        paymentProviders: values.paymentProviders,
        defaultPaymentProvider: values.defaultPaymentProvider,
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
      {saved && <Alert tone="success">{labels.saved}</Alert>}

      <Card className="p-5">
        <h2 className="mb-4 text-base">{labels.branding}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.platformNameKa} error={fieldError(error, "platformNameKa")}>
            <Input
              value={values.platformNameKa}
              onChange={(e) => set("platformNameKa", e.target.value)}
              maxLength={60}
            />
          </Field>
          <Field label={labels.platformName} error={fieldError(error, "platformName")}>
            <Input
              value={values.platformName}
              onChange={(e) => set("platformName", e.target.value)}
              maxLength={60}
              dir="ltr"
            />
          </Field>
          <Field label={labels.taglineKa}>
            <Input
              value={values.taglineKa}
              onChange={(e) => set("taglineKa", e.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label={labels.taglineEn}>
            <Input
              value={values.taglineEn}
              onChange={(e) => set("taglineEn", e.target.value)}
              maxLength={200}
              dir="ltr"
            />
          </Field>
          <Field label={labels.supportEmail} error={fieldError(error, "supportEmail")}>
            <Input
              type="email"
              value={values.supportEmail}
              onChange={(e) => set("supportEmail", e.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label={labels.logoUrl}>
            <Input
              value={values.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="/logo.svg"
              dir="ltr"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base">{labels.commerce}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.currency}>
            <Select value={values.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="GEL">GEL (₾)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </Select>
          </Field>
          <Field
            label={labels.commission}
            hint={labels.commissionHint}
            error={fieldError(error, "commissionPercent")}
          >
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={values.commissionPercent}
              onChange={(e) => set("commissionPercent", e.target.value)}
            />
          </Field>
          <Field label={labels.clearingDays} hint={labels.clearingHint}>
            <Input
              type="number"
              min={0}
              max={180}
              value={values.payoutClearingDays}
              onChange={(e) => set("payoutClearingDays", e.target.value)}
            />
          </Field>
          <Field label={`${labels.payoutMinimum} (${values.currency})`}>
            <Input
              type="number"
              min={0}
              step="1"
              value={values.payoutMinimum}
              onChange={(e) => set("payoutMinimum", e.target.value)}
            />
          </Field>
          <Field label={labels.refundWindow}>
            <Input
              type="number"
              min={0}
              max={365}
              value={values.refundWindowDays}
              onChange={(e) => set("refundWindowDays", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base">{labels.payments}</h2>

        {availableProviders.length === 0 ? (
          <Alert tone="warn">{labels.noProviders}</Alert>
        ) : (
          <>
            <p className="mb-3 text-[13px] font-semibold text-ink">{labels.enabledProviders}</p>
            <ul className="space-y-2">
              {availableProviders.map((provider) => {
                const enabled = values.paymentProviders.includes(provider.id);
                return (
                  <li key={provider.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                        enabled
                          ? "border-brand-300 bg-brand-50/50"
                          : "border-line-strong hover:bg-surface-muted",
                      )}
                    >
                      <Checkbox
                        checked={enabled}
                        onChange={() => toggleProvider(provider.id)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                          <span aria-hidden="true">{provider.icon}</span>
                          {provider.label}
                          {provider.manualSettlement && (
                            <span className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                              {locale === "en" ? "manual" : "ხელით"}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-ink-muted">
                          {provider.description}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <Field className="mt-4" label={labels.defaultProvider}>
              <Select
                value={values.defaultPaymentProvider}
                onChange={(e) => set("defaultPaymentProvider", e.target.value)}
              >
                {availableProviders
                  .filter((provider) => values.paymentProviders.includes(provider.id))
                  .map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
              </Select>
            </Field>
          </>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base">
          {labels.moderation} · {labels.access}
        </h2>
        <div className="space-y-3">
          <Toggle
            label={labels.approvalRequired}
            checked={values.courseApprovalRequired}
            onChange={(v) => set("courseApprovalRequired", v)}
          />
          <Toggle
            label={labels.registrationOpen}
            checked={values.registrationOpen}
            onChange={(v) => set("registrationOpen", v)}
          />
          <Toggle
            label={labels.creatorRegistrationOpen}
            checked={values.creatorRegistrationOpen}
            onChange={(v) => set("creatorRegistrationOpen", v)}
          />
          <Toggle
            label={labels.creatorAutoApprove}
            checked={values.creatorAutoApprove}
            onChange={(v) => set("creatorAutoApprove", v)}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base">{labels.seo}</h2>
        <Field label={labels.seoTitle}>
          <Input
            value={values.seoDefaultTitleKa}
            onChange={(e) => set("seoDefaultTitleKa", e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field className="mt-4" label={labels.seoDescription}>
          <Textarea
            value={values.seoDefaultDescriptionKa}
            onChange={(e) => set("seoDefaultDescriptionKa", e.target.value)}
            rows={3}
            maxLength={300}
          />
        </Field>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="shadow-lg">
          {saved ? labels.saved : labels.save}
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[13px] text-ink">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
