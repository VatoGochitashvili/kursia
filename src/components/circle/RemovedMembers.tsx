"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Avatar, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { TimeAgo } from "@/components/ui/TimeAgo";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

export interface RemovedRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  reason: string | null;
  removedAt: string;
}

/**
 * Who was removed, and the way back.
 *
 * Shown to moderators only. A removal that cannot be undone from the same
 * screen that made it is a trap — people are removed in anger and let back in
 * an hour later.
 */
export function RemovedMembers({
  creatorId,
  rows,
  locale,
  t,
}: {
  creatorId: string;
  rows: RemovedRow[];
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function restore(userId: string) {
    setPending(userId);
    try {
      await api.delete(
        `/api/communities/members?creatorId=${encodeURIComponent(creatorId)}&userId=${encodeURIComponent(userId)}`,
      );
      toast.show(t.circle.memberRestored, "success");
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold">{t.circle.removedTitle}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">{t.circle.removedEmpty}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((row) => (
            <li
              key={row.userId}
              className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
            >
              <Avatar src={row.avatarUrl} name={row.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">{row.name}</p>
                <p className="truncate text-[12px] text-ink-subtle">
                  <TimeAgo date={row.removedAt} locale={locale} />
                  {row.reason ? ` · ${row.reason}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                loading={pending === row.userId}
                onClick={() => restore(row.userId)}
              >
                {t.circle.restore}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
