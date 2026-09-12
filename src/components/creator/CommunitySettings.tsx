"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Checkbox, Field, Input, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface CourseRow {
  id: string;
  title: string;
  includedInMembership: boolean;
  priceMinor: number;
  currency: string;
}

/**
 * A creator opening and pricing their community.
 *
 * The price is entered in whole GEL and stored in tetri — money is integer
 * minor units everywhere behind this form, and the conversion happens once,
 * here, rather than in five places that might round differently.
 *
 * Changing the price never touches a period somebody already paid for: each
 * subscription stores the amount it agreed to. The note under the field says
 * so, because a creator raising their price should not have to guess whether
 * they are about to overcharge their existing members.
 */
export function CommunitySettings({
  initial,
  courses,
  communityHref,
  locale,
  t,
}: {
  initial: {
    enabled: boolean;
    name: string;
    tagline: string;
    description: string;
    priceMinor: number;
    currency: string;
    memberCount: number;
  };
  courses: CourseRow[];
  communityHref: string;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    enabled: initial.enabled,
    name: initial.name,
    tagline: initial.tagline,
    description: initial.description,
    // Whole units in the box; tetri on the wire.
    price: initial.priceMinor === 0 ? "" : String(Math.round(initial.priceMinor / 100)),
  });
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(courses.filter((c) => c.includedInMembership).map((c) => c.id)),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceMinor = Math.max(0, Math.round(Number(form.price || 0) * 100));
  const priceInvalid = form.price !== "" && !Number.isFinite(Number(form.price));

  async function save() {
    if (priceInvalid) return;
    setPending(true);
    setError(null);
    try {
      await api.patch("/api/communities/settings", {
        enabled: form.enabled,
        name: form.name.trim() || null,
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        priceMinor,
        includedCourseIds: [...included],
      });
      toast.show(t.membership.saved, "success");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  function toggleCourse(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-5">
      {error && <Alert tone="danger">{error}</Alert>}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base">{t.membership.settingsTitle}</h2>
            <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-muted">
              {t.membership.settingsBody}
            </p>
          </div>
          {initial.enabled && (
            <a
              href={communityHref}
              className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
            >
              {t.community.title}
              <Icon name="external" size={14} />
            </a>
          )}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-line p-4">
          <Checkbox
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold">{t.membership.enable}</span>
            {initial.memberCount > 0 && (
              <span className="mt-0.5 block text-[12px] text-ink-subtle">
                {fill(t.membership.members, { count: formatNumber(initial.memberCount) })}
              </span>
            )}
          </span>
        </label>
      </Card>

      <Card className="grid gap-4 p-5">
        <Field label={t.membership.nameLabel}>
          <Input
            value={form.name}
            placeholder={t.membership.namePlaceholder}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>

        <Field label={t.membership.taglineLabel}>
          <Input
            value={form.tagline}
            placeholder={t.membership.taglinePlaceholder}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </Field>

        <Field label={t.membership.descriptionLabel}>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <Field
          label={t.membership.priceLabel}
          hint={t.membership.priceHint}
          error={priceInvalid ? t.membership.priceHint : undefined}
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="max-w-[160px]"
              value={form.price}
              placeholder="0"
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <span className="text-[14px] font-semibold text-ink-muted">
              {t.membership.perMonth}
            </span>
          </div>
        </Field>

        <p className="text-[12px] text-ink-subtle">
          {priceMinor === 0
            ? t.membership.free
            : formatMoney(priceMinor, initial.currency) + t.membership.perMonth}
        </p>
      </Card>

      {courses.length > 0 && (
        <Card className="p-5">
          <h2 className="text-base">{t.membership.coursesTitle}</h2>
          <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-muted">
            {t.membership.coursesHint}
          </p>

          <ul className="mt-4 grid gap-2">
            {courses.map((course) => {
              const on = included.has(course.id);
              return (
                <li key={course.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                      on ? "border-brand-300 bg-brand-50/40" : "border-line hover:bg-surface-sunken",
                    )}
                  >
                    <Checkbox checked={on} onChange={() => toggleCourse(course.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">
                        {course.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-subtle">
                        {formatMoney(course.priceMinor, course.currency, {
                          freeLabel: t.common.free,
                        })}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div>
        <Button loading={pending} disabled={priceInvalid} onClick={save}>
          {t.common.save}
        </Button>
      </div>
    </div>
  );
}
