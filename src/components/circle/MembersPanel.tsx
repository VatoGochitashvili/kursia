"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

export interface MemberRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  level: number;
}

/**
 * Who is in the circle, and — for its owner — who helps run it.
 *
 * The appoint and remove buttons are drawn only for the owner, but they decide
 * nothing: the endpoint re-checks, so a tampered client gets a button the
 * server refuses.
 */
export function MembersPanel({
  creatorId,
  members,
  canAssign,
  locale,
  t,
}: {
  creatorId: string;
  members: MemberRow[];
  canAssign: boolean;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function setAdmin(userId: string, makeAdmin: boolean) {
    setPending(userId);
    try {
      if (makeAdmin) {
        await api.post("/api/communities/admins", { creatorId, userId });
        toast.show(t.circle.adminAssigned, "success");
      } else {
        await api.delete(
          `/api/communities/admins?creatorId=${encodeURIComponent(creatorId)}&userId=${encodeURIComponent(userId)}`,
        );
        toast.show(t.circle.adminRemoved, "success");
      }
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

  if (members.length === 0) {
    return <Card className="p-8 text-center text-[14px] text-ink-muted">{t.circle.membersEmpty}</Card>;
  }

  return (
    <Card className="overflow-hidden">
      {canAssign && (
        <p className="border-b border-line bg-surface-sunken/50 px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
          {t.circle.adminsHint}
        </p>
      )}
      <ul>
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex animate-fade-in items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <Avatar src={member.avatarUrl} name={member.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold">
                <span className="truncate">{member.name}</span>
                {member.role === "OWNER" && <Badge tone="brand">{t.circle.owner}</Badge>}
                {member.role === "ADMIN" && <Badge tone="success">{t.circle.admin}</Badge>}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-subtle">
                {fill(t.circle.level, { n: String(member.level) })} ·{" "}
                {fill(t.circle.joined, { date: formatDate(member.joinedAt, locale) })}
              </p>
            </div>

            {canAssign && member.role !== "OWNER" && (
              <Button
                size="sm"
                variant={member.role === "ADMIN" ? "ghost" : "outline"}
                className={member.role === "ADMIN" ? "text-ink-muted" : undefined}
                loading={pending === member.userId}
                onClick={() => setAdmin(member.userId, member.role !== "ADMIN")}
              >
                {member.role === "ADMIN" ? t.circle.removeAdmin : t.circle.makeAdmin}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
