"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n";

/**
 * The two plans, and nothing else.
 *
 * Monthly and yearly, side by side, with the saving stated in money rather
 * than a percentage — "save 98 GEL" is a number somebody can check against the
 * two prices on the same screen.
 *
 * Paying is what makes an account a creator: the profile is created by the
 * checkout, so there is no separate "become an instructor" step that hands out
 * a studio nobody has paid for.
 */
export function StartPlans({
  monthlyMinor,
  yearlyMinor,
  currency,
  isSignedIn,
  loginHref,
  t,
}: {
  monthlyMinor: number;
  yearlyMinor: number;
  currency: string;
  isSignedIn: boolean;
  loginHref: string;
  t: Dictionary;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saving = monthlyMinor * 12 - yearlyMinor;
  const perks = [t.start.perk1, t.start.perk2, t.start.perk3, t.start.perk4];

  async function choose(interval: "MONTHLY" | "YEARLY") {
    if (!isSignedIn) {
      router.push(loginHref);
      return;
    }
    setPending(interval);
    setError(null);
    try {
      const result = await api.post<{ redirectUrl: string }>("/api/creator-plan", { interval });
      router.push(result.redirectUrl);
    } catch (err) {
      setError(errorMessage(err));
      setPending(null);
    }
  }

  const plans = [
    {
      key: "MONTHLY" as const,
      name: t.start.monthly,
      amount: monthlyMinor,
      per: t.start.perMonth,
      highlight: false,
    },
    {
      key: "YEARLY" as const,
      name: t.start.yearly,
      amount: yearlyMinor,
      per: t.start.perYear,
      highlight: saving > 0,
    },
  ];

  return (
    <div className="grid gap-5">
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.key}
            className={cn(
              "relative flex flex-col p-6 transition-shadow",
              plan.highlight ? "border-brand-300 shadow-md" : "",
            )}
          >
            {plan.highlight && saving > 0 && (
              <span className="absolute right-5 top-5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                {fill(t.start.save, { amount: formatMoney(saving, currency) })}
              </span>
            )}

            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {plan.name}
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-[2.2rem] font-bold leading-none tracking-tight">
                {formatMoney(plan.amount, currency)}
              </span>
              <span className="text-[14px] font-semibold text-ink-muted">{plan.per}</span>
            </p>

            <ul className="mt-5 grid gap-2 text-[14px]">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Button
                size="lg"
                fullWidth
                variant={plan.highlight ? "primary" : "outline"}
                loading={pending === plan.key}
                onClick={() => choose(plan.key)}
              >
                {isSignedIn ? t.start.cta : t.start.signInCta}
                <Icon name="arrowRight" size={17} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-center text-[13px] leading-relaxed text-ink-muted">{t.start.note}</p>
    </div>
  );
}
