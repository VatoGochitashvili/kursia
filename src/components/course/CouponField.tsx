"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

export interface AppliedCoupon {
  code: string;
  discountMinor: number;
  finalMinor: number;
}

/**
 * The buyer's discount-code box.
 *
 * Checking a code is a separate step from paying with it, deliberately: the
 * buyer sees what it is worth before committing, and the figure they are
 * shown comes from the same server function that will price the checkout, so
 * the two cannot disagree.
 *
 * The applied code is lifted to the parent rather than held here, because the
 * purchase button needs to send it and the price summary needs to show it.
 */
export function CouponField({
  courseId,
  isAuthenticated,
  applied,
  onApply,
  onClear,
  currency,
  labels,
}: {
  courseId: string;
  isAuthenticated: boolean;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onClear: () => void;
  currency: string;
  labels: {
    placeholder: string;
    apply: string;
    applied: string;
    remove: string;
    signInFirst: string;
  };
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    const trimmed = code.trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      setError(labels.signInFirst);
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const result = await api.post<{
        ok: boolean;
        message: string | null;
        discountMinor: number;
        finalMinor: number;
      }>("/api/coupons?preview=1", { code: trimmed, courseId });

      if (!result.ok) {
        setError(result.message);
        return;
      }
      onApply({
        code: trimmed.toUpperCase(),
        discountMinor: result.discountMinor,
        finalMinor: result.finalMinor,
      });
      setCode("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-success-500/30 bg-success-50 p-2.5">
        <Icon name="check" size={16} className="shrink-0 text-success-700" />
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-success-700">
          {applied.code} · −{formatMoney(applied.discountMinor, currency, { hideDecimalsWhenWhole: true })}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={labels.remove}
          className="rounded-lg p-1 text-success-700 transition-colors hover:bg-success-500/15"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={code}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          autoCapitalize="characters"
          className={cn("h-10 flex-1 uppercase", error && "border-danger-500")}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void check();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="md"
          loading={checking}
          disabled={!code.trim()}
          onClick={check}
        >
          {labels.apply}
        </Button>
      </div>

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium text-danger-700">
          <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
