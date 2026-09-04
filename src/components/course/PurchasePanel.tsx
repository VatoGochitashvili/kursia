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
  labels: Record<string, string>;
  loginHref: string;
  learnHref: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [wishlisted, setWishlisted] = useState(initiallyWishlisted);

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
        {isEnrolled && <p className="text-center text-[13px] text-success-700">{labels.owned}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <Button size="lg" fullWidth loading={pending} onClick={startCheckout}>
        {isFree ? labels.enrollFree : labels.buyNow}
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
