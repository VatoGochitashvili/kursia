"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Field, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, toMajor } from "@/lib/money";
import type { Locale } from "@/lib/enums";

interface PayoutMethod {
  id: string;
  accountName: string;
  iban: string;
  bankName: string | null;
  isDefault: boolean;
  verifiedAt: Date | null;
}

/**
 * Payout request + bank details.
 *
 * The withdrawable figure shown here is the server's, and the server re-checks
 * it inside a transaction when the request is submitted — the number on screen
 * is informational, never the authority.
 */
export function PayoutPanel({
  balance,
  methods,
  locale,
  labels,
}: {
  balance: {
    withdrawableMinor: number;
    pendingMinor: number;
    reservedMinor: number;
    currency: string;
    minimumMinor: number;
  };
  methods: PayoutMethod[];
  locale: Locale;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    balance.withdrawableMinor > 0 ? String(toMajor(balance.withdrawableMinor, balance.currency)) : "",
  );
  const [methodId, setMethodId] = useState(methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [addingMethod, setAddingMethod] = useState(methods.length === 0);

  const money = (minor: number) => formatMoney(minor, balance.currency);
  const canRequest =
    methods.length > 0 && balance.withdrawableMinor >= balance.minimumMinor && !done;

  async function requestPayout() {
    setPending(true);
    setError(null);
    try {
      await api.post("/api/payouts", {
        amount,
        ...(methodId ? { methodId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  async function addMethod(form: FormData) {
    setPending(true);
    setError(null);
    try {
      await api.put("/api/payouts", {
        accountName: String(form.get("accountName") ?? ""),
        iban: String(form.get("iban") ?? ""),
        bankName: String(form.get("bankName") ?? "") || undefined,
        isDefault: true,
      });
      setAddingMethod(false);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-[13px] font-medium text-ink-muted">{labels.available}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-ink">
          {money(balance.withdrawableMinor)}
        </p>
        <dl className="mt-3 space-y-1 text-[12px] text-ink-subtle">
          <div className="flex justify-between">
            <dt>{labels.pending}</dt>
            <dd className="tabular-nums">{money(balance.pendingMinor)}</dd>
          </div>
          {balance.reservedMinor > 0 && (
            <div className="flex justify-between">
              <dt>{labels.reserved}</dt>
              <dd className="tabular-nums">{money(balance.reservedMinor)}</dd>
            </div>
          )}
        </dl>

        {error != null && (
          <Alert tone="danger" className="mt-4">
            {errorMessage(error)}
          </Alert>
        )}
        {done && (
          <Alert tone="success" className="mt-4">
            {labels.submitted}
          </Alert>
        )}

        {methods.length === 0 ? (
          <Alert tone="warn" className="mt-4">
            {labels.noMethod}
          </Alert>
        ) : (
          <div className="mt-4 space-y-3">
            <Field label={`${labels.amount} (${balance.currency})`} error={fieldError(error, "amount")}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>

            {methods.length > 1 && (
              <Field label={labels.paymentInfo}>
                <Select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.accountName} · {method.iban.slice(0, 6)}••••{method.iban.slice(-4)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label={labels.note}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </Field>

            <Button fullWidth loading={pending} disabled={!canRequest} onClick={requestPayout}>
              <Icon name="bank" size={16} />
              {labels.request}
            </Button>

            {balance.withdrawableMinor < balance.minimumMinor && (
              <p className="text-center text-[12px] text-ink-subtle">{labels.minimum}</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base">{labels.paymentInfo}</h2>
          {!addingMethod && (
            <button
              type="button"
              onClick={() => setAddingMethod(true)}
              className="text-[13px] font-semibold text-brand-600 hover:underline"
            >
              {labels.addMethod}
            </button>
          )}
        </div>

        {methods.length > 0 && (
          <ul className="mb-4 space-y-2">
            {methods.map((method) => (
              <li key={method.id} className="rounded-xl border border-line p-3">
                <p className="text-[13px] font-semibold text-ink">{method.accountName}</p>
                <p className="font-mono text-[12px] text-ink-muted">
                  {method.iban.slice(0, 6)}••••{method.iban.slice(-4)}
                </p>
                {method.bankName && (
                  <p className="text-[11px] text-ink-subtle">{method.bankName}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {addingMethod && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void addMethod(new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <Field label={labels.accountName} error={fieldError(error, "accountName")}>
              <Input name="accountName" required maxLength={160} />
            </Field>
            <Field
              label={labels.iban}
              hint="GE00XX0000000000000000"
              error={fieldError(error, "iban")}
            >
              <Input name="iban" required dir="ltr" placeholder="GE29TB0000000000000000" />
            </Field>
            <Field label={labels.bankName}>
              <Input name="bankName" maxLength={120} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={pending}>
                {labels.save}
              </Button>
              {methods.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingMethod(false)}
                >
                  {labels.cancel}
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
