"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Hide / restore / remove a review or comment. */
export function ModerationButtons({
  targetType,
  targetId,
  status,
  labels,
}: {
  targetType: "REVIEW" | "COMMENT";
  targetId: string;
  status: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function moderate(action: "HIDE" | "RESTORE" | "REMOVE") {
    setPending(action);
    try {
      await api.post("/api/admin/moderation", { targetType, targetId, action });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      {status === "VISIBLE" ? (
        <Button size="sm" variant="outline" loading={pending === "HIDE"} onClick={() => moderate("HIDE")}>
          <Icon name="eye" size={14} />
          {labels.hide}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          loading={pending === "RESTORE"}
          onClick={() => moderate("RESTORE")}
        >
          {labels.restore}
        </Button>
      )}

      {status !== "REMOVED" && (
        <Button size="sm" variant="ghost" loading={pending === "REMOVE"} onClick={() => moderate("REMOVE")}>
          <Icon name="trash" size={14} />
        </Button>
      )}
    </div>
  );
}
