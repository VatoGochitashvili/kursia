"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { MenuButton, type MenuAction } from "@/components/ui/MenuButton";
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
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  joinedAt: string;
  level: number;
}

/**
 * Who is in the circle, and what can be done about each of them.
 *
 * Every power sits behind the row's three dots rather than in a row of
 * buttons: most of the time this is a list of people, not a control panel.
 *
 * The menu decides nothing. Each endpoint re-checks who is asking, so a
 * tampered client gets a menu item the server refuses.
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
  /** Appointing admins and moderators: the owner's power. */
  canAssign: boolean;
  /** Throwing somebody out: the owner and their admins, never a moderator. */
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

  async function setRole(userId: string, role: "ADMIN" | "MODERATOR" | null) {
    setPending(userId);
    try {
      if (role) {
        await api.post("/api/communities/admins", { creatorId, userId, role });
        toast.show(role === "ADMIN" ? t.circle.adminAssigned : t.circle.moderatorAssigned, "success");
      } else {
        await api.delete(
          `/api/communities/admins?creatorId=${encodeURIComponent(creatorId)}&userId=${encodeURIComponent(userId)}`,
        );
        toast.show(t.circle.roleRemoved, "success");
      }
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

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
        {members.map((member) => {
          const isOwner = member.role === "OWNER";
          const actions: MenuAction[] = [
            {
              label: t.circle.viewProfile,
              icon: "user",
              onSelect: () => router.push(`${profileBase}/${member.userId}`),
            },
            {
              label: t.circle.makeAdmin,
              icon: "shield",
              hidden: !canAssign || isOwner || member.role === "ADMIN",
              onSelect: () => setRole(member.userId, "ADMIN"),
            },
            {
              label: t.circle.makeModerator,
              icon: "check",
              hidden: !canAssign || isOwner || member.role === "MODERATOR",
              onSelect: () => setRole(member.userId, "MODERATOR"),
            },
            {
              label: t.circle.removeRole,
              icon: "minus",
              hidden: !canAssign || isOwner || member.role === "MEMBER",
              onSelect: () => setRole(member.userId, null),
            },
            {
              label: t.circle.removeMember,
              icon: "trash",
              danger: true,
              // An appointed admin is only the owner's to throw out; the
              // endpoint enforces the same rule.
              hidden: !canRemove || isOwner || (member.role === "ADMIN" && !canAssign),
              onSelect: () => {
                setRemoving(member.userId);
                setReason("");
              },
            },
          ];

          return (
            <li key={member.userId} className="animate-fade-in border-b border-line last:border-b-0">
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
                      {member.role === "MODERATOR" && <Badge>{t.circle.moderator}</Badge>}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-subtle">
                      {fill(t.circle.level, { n: String(member.level) })} ·{" "}
                      {fill(t.circle.joined, { date: formatDate(member.joinedAt, locale) })}
                    </p>
                  </div>
                </Link>

                <MenuButton actions={actions} label={t.circle.memberActions} />
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
          );
        })}
      </ul>
    </Card>
  );
}
