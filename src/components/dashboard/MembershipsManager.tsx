"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Card, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/enums";

export interface ManagedMembership {
  creatorId: string;
  name: string;
  /** Already formatted: "Renews 12 Oct" or "Ends 12 Oct". */
  status: string;
  cancelled: boolean;
}

/**
 * The memberships somebody pays for, and the quiet way to stop one.
 *
 * Deliberately at the bottom of settings and deliberately small: leaving is
 * a real choice people must be able to make, but it is not the thing a
 * circle should advertise. Each one takes a code from the inbox on file.
 */
export function MembershipsManager({
  memberships,
  labels,
  locale,
}: {
  memberships: ManagedMembership[];
  labels: Record<string, string>;
  locale: Locale;
}) {
  const router = useRouter();
  const toast = useToast();
  const [leaving, setLeaving] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  async function send(creatorId: string) {
    setLeaving(creatorId);
    setCode("");
    setPending(true);
    try {
      await api.post("/api/communities/leave", {});
      setSent(true);
      toast.show(labels.leaveSent, "success");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  async function confirm(creatorId: string) {
    setPending(true);
    try {
      const result = await api.delete<{ accessUntil: string }>(
        `/api/communities?creatorId=${encodeURIComponent(creatorId)}&code=${encodeURIComponent(code)}`,
      );
      toast.show(
        labels.leaveDone!.replace("{date}", formatDate(result.accessUntil, locale)),
        "success",
      );
      setLeaving(null);
      setSent(false);
      router.refresh();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold">{labels.membershipsTitle}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{labels.membershipsHint}</p>

      {memberships.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-muted">{labels.membershipsEmpty}</p>
      ) : (
        <ul className="mt-3 grid gap-1">
          {memberships.map((m) => (
            <li key={m.creatorId} className="rounded-xl px-1 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{m.name}</span>
                  <span className="block text-[12px] text-ink-subtle">{m.status}</span>
                </span>
                {!m.cancelled && leaving !== m.creatorId && (
                  <button
                    type="button"
                    onClick={() => send(m.creatorId)}
                    className="shrink-0 text-[12.5px] font-medium text-ink-subtle underline-offset-2 hover:text-danger-700 hover:underline"
                  >
                    {labels.leaveCircle}
                  </button>
                )}
              </div>

              {leaving === m.creatorId && sent && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="h-9 w-28 text-center font-mono tracking-[0.3em]"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    loading={pending}
                    disabled={code.length !== 6}
                    onClick={() => confirm(m.creatorId)}
                  >
                    {labels.leaveConfirm}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLeaving(null);
                      setSent(false);
                    }}
                  >
                    {labels.cancel}
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
