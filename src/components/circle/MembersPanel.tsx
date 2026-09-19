"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Avatar, Badge, Card, Input } from "@/components/ui/primitives";
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
  canRemove,
  profileBase,
  locale,
  t,
}: {
  creatorId: string;
  members: MemberRow[];
  canAssign: boolean;
  /** Owners and admins may remove people; admins may not remove other admins. */
  canRemove: boolean;
  /** The members page's own path; a member's profile is `${profileBase}/${userId}`. */
  profileBase: string;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function remove(userId: string) {
    setPending(userId);
    try {
      await api.post("/api/communities/members", {
        creatorId,
        userId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast.show(t.circle.memberRemoved, "success");
      setRemoving(null);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

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
            className="animate-fade-in border-b border-line last:border-b-0"
          >
            <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href={`${profileBase}/${member.userId}`}
              className="group flex min-w-0 flex-1 items-center gap-3"
            >
            <Avatar src={member.avatarUrl} name={member.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold">
                <span className="truncate group-hover:underline">{member.name}</span>
                {member.role === "OWNER" && <Badge tone="brand">{t.circle.owner}</Badge>}
                {member.role === "ADMIN" && <Badge tone="success">{t.circle.admin}</Badge>}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-subtle">
                {fill(t.circle.level, { n: String(member.level) })} ·{" "}
                {fill(t.circle.joined, { date: formatDate(member.joinedAt, locale) })}
              </p>
            </div>
            </Link>

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

            {/* Removing somebody ends their subscription, so it asks once
                rather than acting on a single stray click. */}
            {canRemove && member.role !== "OWNER" && (member.role !== "ADMIN" || canAssign) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-danger-700"
                onClick={() => {
                  setRemoving(removing === member.userId ? null : member.userId);
                  setReason("");
                }}
              >
                {t.circle.removeMember}
              </Button>
            )}
            </div>

            {removing === member.userId && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line bg-danger-50/40 px-4 py-3">
                <p className="w-full text-[13px] font-medium text-danger-700">
                  {t.circle.removeConfirm}
                </p>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t.circle.removeReason}
                  className="h-9 min-w-48 flex-1 text-[13px]"
                />
                <Button
                  size="sm"
                  variant="danger"
                  loading={pending === member.userId}
                  onClick={() => remove(member.userId)}
                >
                  {t.circle.removeMember}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>
                  {t.common.cancel}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
