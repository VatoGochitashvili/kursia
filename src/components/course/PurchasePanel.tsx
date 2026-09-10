"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Buy / wishlist actions.
 *
 * The button only ever *starts* a checkout — it receives a redirect URL from
 * the server and navigates there. It never marks anything as purchased, and
 * the enrolment state shown on this page always comes from the server.
 */
export function PurchaseActions({
  courseId,
  courseSlug,
  isAuthenticated,
  isEnrolled,
  isOwnCourse,
  initiallyWishlisted,
  isFree,
  pricing,
  accessUntilLabel,
  labels,
  loginHref,
  learnHref,
}: {
  courseId: string;
  courseSlug: string;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  isOwnCourse: boolean;
  initiallyWishlisted: boolean;
  isFree: boolean;
  /**
   * How this course may be bought, and what each option costs — formatted on
   * the server, because money must never be formatted with Intl on a path
   * that also renders on the server (ka-GE differs between Node and browsers
   * and the mismatch shows up as a hydration error).
   */
  pricing: {
    model: "ONE_TIME" | "SUBSCRIPTION" | "BOTH";
    oneTimeLabel: string;
    monthlyLabel: string | null;
  };
  /** Formatted on the server — see the note on `pricing`. Null = never expires. */
  accessUntilLabel: string | null;
  labels: Record<string, string>;
  loginHref: string;
  learnHref: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [wishlisted, setWishlisted] = useState(initiallyWishlisted);
  // When a course offers both, default to the one-time purchase: it is the
  // option with no recurring commitment, so it is the safer default to
  // pre-select on the buyer's behalf.
  const [kind, setKind] = useState<"ONE_TIME" | "SUBSCRIPTION">(
    pricing.model === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME",
  );

  async function startCheckout() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ redirectUrl: string; free: boolean }>("/api/checkout", {
        courseId,
        kind,
      });
      // A free course is enrolled server-side and lands straight in the player.
      router.push(result.redirectUrl);
      router.refresh();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  async function toggleWishlist() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    const next = !wishlisted;
    setWishlisted(next); // optimistic
    try {
      if (next) await api.post("/api/wishlist", { courseId });
      else await api.delete(`/api/wishlist?courseId=${encodeURIComponent(courseId)}`);
    } catch {
      setWishlisted(!next); // roll back on failure
    }
  }

  if (isEnrolled || isOwnCourse) {
    return (
      <div className="space-y-2.5">
        <ButtonLink href={learnHref} size="lg" fullWidth>
          <Icon name="play" size={17} filled />
          {isOwnCourse ? labels.preview : labels.continueLearning}
        </ButtonLink>

        {/* A monthly student needs to know when this runs out, and be able to
            act on it before it does — not discover it by losing access. */}
        {isEnrolled && accessUntilLabel && (
          <>
            <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-ink-muted">
              <Icon name="clock" size={14} />
              {accessUntilLabel}
            </p>
            <Button variant="outline" size="md" fullWidth loading={pending} onClick={startCheckout}>
              <Icon name="refresh" size={15} />
              {labels.renewAccess}
            </Button>
          </>
        )}

        {isEnrolled && !accessUntilLabel && (
          <p className="text-center text-[13px] text-success-700">{labels.owned}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      {/* The choice the buyer asked for: pay once, or pay monthly. Only
          rendered when the creator actually offers both. */}
      {!isFree && pricing.model === "BOTH" && pricing.monthlyLabel && (
        <fieldset className="space-y-2">
          <legend className="sr-only">{labels.choosePlan}</legend>
          <PlanOption
            selected={kind === "ONE_TIME"}
            onSelect={() => setKind("ONE_TIME")}
            title={labels.planOneTime}
            price={pricing.oneTimeLabel}
            note={labels.planOneTimeNote}
          />
          <PlanOption
            selected={kind === "SUBSCRIPTION"}
            onSelect={() => setKind("SUBSCRIPTION")}
            title={labels.planMonthly}
            price={pricing.monthlyLabel}
            note={labels.planMonthlyNote}
          />
        </fieldset>
      )}

      {!isFree && pricing.model === "SUBSCRIPTION" && (
        <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-brand-700">
          {labels.planMonthlyNote}
        </p>
      )}

      <Button size="lg" fullWidth loading={pending} onClick={startCheckout}>
        {isFree
          ? labels.enrollFree
          : kind === "SUBSCRIPTION"
            ? labels.subscribeNow
            : labels.buyNow}
      </Button>

      <Button variant="outline" size="lg" fullWidth onClick={toggleWishlist}>
        <Icon
          name="heart"
          size={17}
          filled={wishlisted}
          className={cn(wishlisted && "text-accent-500")}
        />
        {wishlisted ? labels.inWishlist : labels.addToWishlist}
      </Button>
    </div>
  );
}

/** One selectable plan. A real radio, so keyboard and screen readers work. */
function PlanOption({
  selected,
  onSelect,
  title,
  price,
  note,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  note: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-200",
        selected
          ? "border-brand-400 bg-brand-50/60 shadow-[0_0_0_1px_rgb(53_89_240_/_0.25)]"
          : "border-line hover:border-brand-200 hover:bg-surface-muted",
      )}
    >
      <input
        type="radio"
        name="plan"
        checked={selected}
        onChange={onSelect}
        className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[14px] font-semibold text-ink">{title}</span>
          <span className="text-[15px] font-bold text-ink">{price}</span>
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">{note}</span>
      </span>
    </label>
  );
}
