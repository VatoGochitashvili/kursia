"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

/**
 * The creator's plan.
 *
 * States it in plain terms, including what lapsing actually costs: the circle
 * comes off the directory, and nothing else. A creator deciding whether to
 * keep paying deserves to know that their courses and their balance are not
 * hostage to it.
 */
export function PlanPanel({
  priceMinor,
  currency,
  isFree,
  active,
  status,
  currentPeriodEnd,
  locale,
  t,
}: {
  priceMinor: number;
  currency: string;
  isFree: boolean;
  active: boolean;
  status: "NONE" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  currentPeriodEnd: string | null;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function subscribe() {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ redirectUrl: string }>("/api/creator-plan");
      router.push(result.redirectUrl);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  async function cancel() {
    setPending(true);
    try {
      await api.delete("/api/creator-plan");
      toast.show(t.plan.cancelled, "success");
      setConfirmCancel(false);
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  if (isFree) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700">
            <Icon name="check" size={20} />
          </span>
          <p className="text-[15px] font-semibold">{t.plan.free}</p>
        </div>
      </Card>
    );
  }

  const perks = [t.plan.perkCircle, t.plan.perkMembers, t.plan.perkTools, t.plan.perkSupport];

  return (
    <div className="grid gap-5">
      {error && <Alert tone="danger">{error}</Alert>}

      {!active && (
        <Alert tone="warn">
          <span className="font-semibold">{t.plan.inactive}</span>
          <span className="mt-0.5 block text-[13px]">{t.plan.inactiveBody}</span>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-surface-sunken/60 p-6 text-center">
          <p className="flex items-baseline justify-center gap-1">
            <span className="text-[34px] font-bold leading-none tracking-tight">
              {formatMoney(priceMinor, currency)}
            </span>
            <span className="text-[14px] font-semibold text-ink-muted">{t.plan.perMonth}</span>
          </p>

          {active && currentPeriodEnd && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-success-700">
              <Icon name="check" size={15} />
              {status === "CANCELLED"
                ? fill(t.plan.endsOn, { date: formatDate(currentPeriodEnd, locale) })
                : fill(t.plan.renewsOn, { date: formatDate(currentPeriodEnd, locale) })}
            </p>
          )}
        </div>

        <div className="p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            {t.plan.whatYouGet}
          </p>
          <ul className="mt-3 grid gap-2 text-[14px]">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-600" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {!active || status === "CANCELLED" ? (
              <Button size="lg" loading={pending} onClick={subscribe}>
                {status === "CANCELLED" ? t.plan.renew : t.plan.subscribe}
                <Icon name="arrowRight" size={17} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="text-ink-muted"
                onClick={() => setConfirmCancel(true)}
              >
                {t.plan.cancel}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmCancel}
        title={t.plan.cancel}
        body={t.plan.cancelConfirm}
        confirmLabel={t.plan.cancel}
        cancelLabel={t.common.cancel}
        pending={pending}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
