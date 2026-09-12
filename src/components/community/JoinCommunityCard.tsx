"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatDate, formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

export interface CommunityView {
  creatorId: string;
  name: string;
  tagline: string | null;
  description: string | null;
  priceMinor: number;
  currency: string;
  memberCount: number;
  enabled: boolean;
  includedCourseCount: number;
}

/**
 * The join panel — the one screen where money changes hands for a community.
 *
 * It shows the price before asking for anything, and says plainly what the
 * month buys. A member sees their renewal date and a way out instead: hiding
 * the exit behind a support email is how subscriptions get a bad name, and
 * someone who can see the door is likelier to stay.
 */
export function JoinCommunityCard({
  community,
  isAuthenticated,
  isOwner,
  isSubscriber,
  memberUntil,
  cancelled,
  loginHref,
  locale,
  t,
}: {
  community: CommunityView;
  isAuthenticated: boolean;
  isOwner: boolean;
  isSubscriber: boolean;
  memberUntil: string | null;
  cancelled: boolean;
  loginHref: string;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const free = community.priceMinor === 0;

  async function join() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ redirectUrl: string; free: boolean }>("/api/communities", {
        creatorId: community.creatorId,
      });
      // A free community is settled server-side and lands straight inside.
      router.push(result.redirectUrl);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  async function leave() {
    setPending(true);
    try {
      await api.delete(
        `/api/communities?creatorId=${encodeURIComponent(community.creatorId)}`,
      );
      toast.show(t.membership.cancelled, "success");
      setConfirmLeave(false);
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  const perks = [
    t.membership.perkFeed,
    community.includedCourseCount > 0 ? t.membership.perkCourses : null,
    t.membership.perkEvents,
    t.membership.perkLeaderboard,
  ].filter(Boolean) as string[];

  // ── Already inside ───────────────────────────────────────────────────────
  if (isSubscriber) {
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700">
            <Icon name="check" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{t.membership.youAreMember}</p>
            {memberUntil && (
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {cancelled
                  ? fill(t.membership.cancelledNotice, {
                      date: formatDate(memberUntil, locale),
                    })
                  : fill(t.membership.renewsOn, { date: formatDate(memberUntil, locale) })}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cancelled ? (
            <Button size="sm" loading={pending} onClick={join}>
              {t.membership.renew}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-ink-muted"
              onClick={() => setConfirmLeave(true)}
            >
              {t.membership.cancel}
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={confirmLeave}
          title={t.membership.cancel}
          body={t.membership.cancelConfirm}
          confirmLabel={t.membership.cancel}
          cancelLabel={t.common.cancel}
          pending={pending}
          onConfirm={leave}
          onCancel={() => setConfirmLeave(false)}
        />
      </Card>
    );
  }

  // ── Outside, looking in ──────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-surface-sunken/60 p-6 text-center">
        <h2 className="text-xl">{community.name}</h2>
        {community.tagline && (
          <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed text-ink-muted">
            {community.tagline}
          </p>
        )}

        <p className="mt-5 flex items-baseline justify-center gap-1">
          <span className="text-[34px] font-bold leading-none tracking-tight">
            {free
              ? t.membership.free
              : formatMoney(community.priceMinor, community.currency)}
          </span>
          {!free && (
            <span className="text-[14px] font-semibold text-ink-muted">
              {t.membership.perMonth}
            </span>
          )}
        </p>

        {community.memberCount > 0 && (
          <p className="mt-2 text-[12px] text-ink-subtle">
            {fill(t.membership.members, { count: formatNumber(community.memberCount) })}
          </p>
        )}
      </div>

      <div className="p-6">
        {error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
          {t.membership.whatYouGet}
        </p>
        <ul className="mt-3 grid gap-2 text-[14px] text-ink">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5">
              <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-600" />
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {isOwner ? (
            <p className="rounded-xl bg-surface-sunken px-4 py-3 text-center text-[13px] text-ink-muted">
              {t.membership.ownerCannotJoin}
            </p>
          ) : !isAuthenticated ? (
            <ButtonLink href={loginHref} size="lg" fullWidth>
              {t.membership.signInToJoin}
            </ButtonLink>
          ) : (
            <Button size="lg" fullWidth loading={pending} onClick={join}>
              {free ? t.membership.joinFree : t.membership.join}
              <Icon name="arrowRight" size={17} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
