"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatCount } from "@/lib/format";
import type { Locale } from "@/lib/enums";

/**
 * Follow a creator, to hear when they publish something new.
 *
 * The count updates from the server's response rather than by incrementing
 * locally: two tabs, or a follow that raced with someone else's, would
 * otherwise drift apart and show a number that was never true.
 *
 * A signed-out visitor is sent to log in rather than shown a dead control —
 * the button is the invitation to have an account.
 */
export function FollowButton({
  creatorId,
  isAuthenticated,
  initiallyFollowing,
  initialFollowers,
  locale,
  loginHref,
  labels,
}: {
  creatorId: string;
  isAuthenticated: boolean;
  initiallyFollowing: boolean;
  initialFollowers: number;
  locale: Locale;
  loginHref: string;
  labels: { follow: string; following: string; followers: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    setPending(true);
    const next = !following;
    try {
      const result = next
        ? await api.post<{ followers: number }>("/api/follow", { creatorId })
        : await api.delete<{ followers: number }>(
            `/api/follow?creatorId=${encodeURIComponent(creatorId)}`,
          );
      setFollowing(next);
      setFollowers(result.followers);
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant={following ? "outline" : "primary"}
        onClick={toggle}
        loading={pending}
      >
        <Icon name={following ? "check" : "plus"} size={16} />
        {following ? labels.following : labels.follow}
      </Button>

      {followers > 0 && (
        <span className="text-[13px] text-ink-muted">
          <span className="font-semibold tabular-nums text-ink">
            {formatCount(followers, locale)}
          </span>{" "}
          {labels.followers}
        </span>
      )}
    </div>
  );
}
