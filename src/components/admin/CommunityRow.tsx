"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Avatar, Badge, Card, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import type { Dictionary } from "@/i18n";

export interface AdminCommunity {
  creatorId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  name: string;
  tagline: string | null;
  status: string;
  reviewNote: string | null;
  enabled: boolean;
  priceMinor: number;
  currency: string;
  memberCount: number;
  planActive: boolean;
  submittedAt: string | null;
}

const TONE: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  APPROVED: "success",
  PENDING: "warn",
  REJECTED: "danger",
  SUSPENDED: "danger",
  DRAFT: "neutral",
};

/**
 * One circle in the admin queue.
 *
 * A refusal asks for a reason before it will send. The creator gets that text
 * verbatim in their notification, and "no" with no explanation is the fastest
 * way to lose somebody who would otherwise have fixed the problem.
 */
export function CommunityRow({ community, t }: { community: AdminCommunity; t: Dictionary }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState(community.reviewNote ?? "");
  const [refusing, setRefusing] = useState<"REJECTED" | "SUSPENDED" | null>(null);

  async function decide(status: string, withNote?: string) {
    setPending(status);
    try {
      await api.patch(`/api/admin/communities/${community.creatorId}`, {
        status,
        note: withNote || undefined,
      });
      toast.show(t.common.saved, "success");
      setRefusing(null);
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar src={community.avatarUrl} name={community.displayName} size={42} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/community/${community.slug}`}
              className="text-[15px] font-semibold hover:text-brand-600"
            >
              {community.name}
            </Link>
            <Badge tone={TONE[community.status] ?? "neutral"}>{community.status}</Badge>
            {!community.enabled && <Badge>{t.admin.disabled}</Badge>}
            {!community.planActive && <Badge tone="danger">{t.plan.noPlan}</Badge>}
          </div>

          <p className="mt-0.5 text-[12px] text-ink-subtle">{community.displayName}</p>

          {community.tagline && (
            <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-muted">{community.tagline}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="users" size={13} />
              {formatNumber(community.memberCount)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="wallet" size={13} />
              {community.priceMinor === 0
                ? t.membership.free
                : formatMoney(community.priceMinor, community.currency)}
            </span>
          </div>

          {community.reviewNote && community.status !== "APPROVED" && (
            <p className="mt-2 rounded-lg bg-surface-sunken px-3 py-2 text-[12px] text-ink-muted">
              {community.reviewNote}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {community.status !== "APPROVED" && (
            <Button
              size="sm"
              loading={pending === "APPROVED"}
              onClick={() => decide("APPROVED", note)}
            >
              {t.admin.approve}
            </Button>
          )}
          {community.status !== "REJECTED" && community.status !== "SUSPENDED" && (
            <Button
              size="sm"
              variant="outline"
              className="border-danger-500/40 text-danger-700"
              onClick={() => setRefusing(community.status === "APPROVED" ? "SUSPENDED" : "REJECTED")}
            >
              {community.status === "APPROVED" ? t.admin.suspend : t.admin.reject}
            </Button>
          )}
        </div>
      </div>

      {refusing && (
        <div className="mt-4 animate-fade-up border-t border-line pt-4">
          <label className="text-[12px] font-semibold text-ink-muted">{t.admin.reasonLabel}</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Input
              className="min-w-[220px] flex-1"
              value={note}
              placeholder={t.admin.reasonPlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="danger"
              loading={pending === refusing}
              disabled={note.trim().length < 3}
              onClick={() => decide(refusing, note)}
            >
              {refusing === "SUSPENDED" ? t.admin.suspend : t.admin.reject}
            </Button>
            <Button variant="ghost" onClick={() => setRefusing(null)}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
