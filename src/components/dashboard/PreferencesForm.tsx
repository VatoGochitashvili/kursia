"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import type { Preferences } from "@/lib/preferences";

type Key = keyof Preferences;

/**
 * Mail, privacy and closing the account.
 *
 * Each switch saves on its own the moment it is flipped — a settings page
 * with one Save button at the bottom is a page where half the changes are
 * lost. Failures put the switch back where it was.
 */
export function PreferencesForm({
  initial,
  labels,
  beforeAccount,
}: {
  initial: Preferences;
  labels: Record<string, string>;
  /** Rendered between privacy and closing the account — memberships go here. */
  beforeAccount?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState<Key | null>(null);

  async function toggle(key: Key) {
    const next = !values[key];
    setValues((v) => ({ ...v, [key]: next }));
    setPending(key);
    try {
      await api.patch("/api/profile/preferences", { [key]: next });
      toast.show(labels.saved, "success");
    } catch (err) {
      setValues((v) => ({ ...v, [key]: !next }));
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(null);
    }
  }

  const emailKeys: Key[] = [
    "emailMessages",
    "emailCircle",
    "emailEvents",
    "emailPurchases",
    "emailProduct",
  ];
  const privacyKeys: Key[] = ["allowMessages", "showMemberships", "showOnLeaderboard"];

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <h2 className="text-[15px] font-bold">{labels.notificationsTitle}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{labels.notificationsHint}</p>
        <ul className="mt-4 grid gap-1">
          {emailKeys.map((key) => (
            <Row
              key={key}
              label={labels[key]!}
              checked={values[key]}
              busy={pending === key}
              onChange={() => toggle(key)}
            />
          ))}
        </ul>

        <div className="mt-5 rounded-xl border border-line bg-surface-sunken/50 p-3.5">
          <p className="text-[13.5px] font-semibold">{labels.pushTitle}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{labels.pushSoon}</p>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold">{labels.privacyTitle}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{labels.privacyHint}</p>
        <ul className="mt-4 grid gap-1">
          {privacyKeys.map((key) => (
            <Row
              key={key}
              label={labels[key]!}
              checked={values[key]}
              busy={pending === key}
              onChange={() => toggle(key)}
            />
          ))}
        </ul>
      </Card>

      {beforeAccount}

      <DeactivateCard labels={labels} onDone={() => router.push("/")} />
    </div>
  );
}

function Row({
  label,
  checked,
  busy,
  onChange,
}: {
  label: string;
  checked: boolean;
  busy: boolean;
  onChange: () => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-1 py-2.5 transition-colors hover:bg-surface-sunken/60">
        <span className="text-[14px]">{label}</span>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={busy}
          onChange={onChange}
          className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors checked:bg-brand-600 disabled:opacity-50 relative after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform checked:after:translate-x-4"
        />
      </label>
    </li>
  );
}

/** Closing the account: ask for a code, then use it. */
function DeactivateCard({
  labels,
  onDone,
}: {
  labels: Record<string, string>;
  onDone: () => void;
}) {
  const toast = useToast();
  const [stage, setStage] = useState<"idle" | "sent" | "done">("idle");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    try {
      await api.post("/api/account/deactivate", {});
      setStage("sent");
      toast.show(labels.deactivateSent, "success");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setPending(true);
    try {
      await api.delete(`/api/account/deactivate`, { code });
      setStage("done");
      toast.show(labels.deactivateDone, "success");
      onDone();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-danger-200 p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-danger-700">
        <Icon name="alert" size={16} />
        {labels.deactivateTitle}
      </h2>
      <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-muted">
        {labels.deactivateBody}
      </p>

      {stage === "sent" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="h-10 w-32 text-center font-mono text-[16px] tracking-[0.3em]"
          />
          <Button
            variant="danger"
            loading={pending}
            disabled={code.length !== 6}
            onClick={confirm}
          >
            {labels.deactivateConfirm}
          </Button>
        </div>
      ) : stage === "done" ? (
        <Alert tone="success" className="mt-4">
          {labels.deactivateDone}
        </Alert>
      ) : (
        <Button variant="outline" className="mt-4 text-danger-700" loading={pending} onClick={send}>
          {labels.deactivateSend}
        </Button>
      )}
    </Card>
  );
}
