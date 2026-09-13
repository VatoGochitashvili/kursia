"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Avatar, Card, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { TimeAgo } from "@/components/ui/TimeAgo";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface JoinRequest {
  id: string;
  message: string | null;
  createdAt: string;
  user: { id: string; profile: { fullName: string; avatarUrl: string | null } | null };
}

/**
 * The owner's queue of people asking to join.
 *
 * Approving does not let anybody in by itself — it clears the barrier to
 * joining, and they still have to join (and pay, if the circle is paid).
 * Refusing asks for a reason, which the applicant receives.
 */
export function JoinRequests({
  creatorId,
  locale,
  t,
}: {
  creatorId: string;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [refusing, setRefusing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ requests: JoinRequest[] }>(
        `/api/communities/requests?creatorId=${encodeURIComponent(creatorId)}`,
      );
      setRequests(data.requests);
    } catch {
      setRequests([]);
    }
  }, [creatorId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setPending(id);
    try {
      await api.patch(`/api/communities/requests/${id}`, {
        status,
        note: status === "REJECTED" ? note.trim() || undefined : undefined,
      });
      toast.show(t.common.saved, "success");
      setRefusing(null);
      setNote("");
      setRequests((rows) => (rows ?? []).filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

  if (requests === null) {
    return <div className="h-20 animate-pulse rounded-2xl bg-surface-sunken" />;
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-base">
        {t.membership.requestsTitle}
        {requests.length > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
            {requests.length}
          </span>
        )}
      </h2>

      {requests.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-muted">{t.membership.requestsEmpty}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-xl border border-line p-3.5">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar
                  src={request.user.profile?.avatarUrl ?? null}
                  name={request.user.profile?.fullName ?? "—"}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">
                    {request.user.profile?.fullName ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-subtle">
                    <TimeAgo date={request.createdAt} locale={locale} />
                  </p>
                  {request.message && (
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">
                      {request.message}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    loading={pending === request.id && refusing === null}
                    onClick={() => decide(request.id, "APPROVED")}
                  >
                    <Icon name="check" size={15} />
                    {t.membership.approveMember}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-ink-muted"
                    onClick={() => setRefusing(request.id)}
                  >
                    {t.membership.rejectMember}
                  </Button>
                </div>
              </div>

              {refusing === request.id && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Input
                    className="min-w-[200px] flex-1"
                    value={note}
                    placeholder={t.admin.reasonPlaceholder}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    variant="danger"
                    loading={pending === request.id}
                    onClick={() => decide(request.id, "REJECTED")}
                  >
                    {t.membership.rejectMember}
                  </Button>
                  <Button variant="ghost" onClick={() => setRefusing(null)}>
                    {t.common.cancel}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
