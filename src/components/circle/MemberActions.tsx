"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

/**
 * Follow and message, side by side on a member's profile.
 *
 * The follower count comes back from the server rather than being bumped
 * locally, so two tabs cannot drift into a number that was never true.
 */
export function MemberActions({
  userId,
  initiallyFollowing,
  initialFollowers,
  messageHref,
  labels,
}: {
  userId: string;
  initiallyFollowing: boolean;
  initialFollowers: number;
  messageHref: string;
  labels: { follow: string; following: string; message: string; followers: string };
}) {
  const toast = useToast();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const result = following
        ? await api.delete<{ followers: number }>(`/api/follow?userId=${encodeURIComponent(userId)}`)
        : await api.post<{ followers: number }>("/api/follow", { userId });
      setFollowing(!following);
      setFollowers(result.followers);
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={following ? "outline" : "primary"}
        loading={pending}
        onClick={toggle}
        aria-pressed={following}
      >
        <Icon name={following ? "check" : "plus"} size={16} />
        {following ? labels.following : labels.follow}
      </Button>
      <ButtonLink href={messageHref} variant="outline">
        <Icon name="message" size={16} />
        {labels.message}
      </ButtonLink>
      <span className="text-[13px] text-ink-muted" data-followers={followers}>
        <span className="font-semibold tabular-nums text-ink">{followers}</span> {labels.followers}
      </span>
    </div>
  );
}
