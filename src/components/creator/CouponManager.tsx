"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card, Field, Input, Select } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  course: { id: string; title: string } | null;
}

/**
 * Issuing and managing discount codes.
 *
 * Deactivating is offered alongside deleting, and is the safer of the two: a
 * deleted code takes its redemption history with it, so the sales it produced
 * lose the record of why they were discounted. Switching it off stops new
 * redemptions and keeps the history.
 */
export function CouponManager({
  courses,
  currency,
  locale,
  t,
}: {
  courses: { id: string; title: string }[];
  currency: string;
  locale: Locale;
  t: Dictionary;
}) {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pendingDelete, setPendingDelete] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("20");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ coupons: Coupon[] }>("/api/coupons");
      setCoupons(result.coupons);
    } catch (err) {
      setError(err);
      setCoupons([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/coupons", {
        code: code.trim(),
        courseId: courseId || undefined,
        discountType,
        discountValue: Number(discountValue),
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expiresAt: expiresAt || null,
      });
      setCode("");
      setMaxRedemptions("");
      setExpiresAt("");
      await load();
      toast.show(t.creator.couponCreated, "success");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(coupon: Coupon) {
    try {
      await api.patch("/api/coupons", { id: coupon.id, isActive: !coupon.isActive });
      await load();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  async function remove(coupon: Coupon) {
    setBusy(true);
    try {
      await api.delete(`/api/coupons?id=${encodeURIComponent(coupon.id)}`);
      setPendingDelete(null);
      await load();
      toast.show(t.creator.couponDeleted, "success");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  }

  const describe = (c: Coupon) =>
    c.discountType === "PERCENT"
      ? `−${c.discountValue}%`
      : `−${formatMoney(c.discountValue, currency, { hideDecimalsWhenWhole: true })}`;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base">{t.creator.couponNew}</h2>

        {error != null && (
          <Alert tone="danger" className="mb-4">
            {errorMessage(error)}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.creator.couponCode} error={fieldError(error, "code")}>
            <Input
              value={code}
              placeholder="SUMMER20"
              className="uppercase"
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>

          <Field label={t.creator.couponCourse} hint={t.creator.couponCourseHint}>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">{t.creator.couponAllCourses}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.creator.couponType}>
            <Select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}
            >
              <option value="PERCENT">{t.creator.couponPercent}</option>
              <option value="FIXED">{t.creator.couponFixed}</option>
            </Select>
          </Field>

          <Field
            label={discountType === "PERCENT" ? "%" : currency}
            error={fieldError(error, "discountValue")}
          >
            <Input
              type="number"
              min={1}
              max={discountType === "PERCENT" ? 100 : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </Field>

          <Field label={t.creator.couponLimit} hint={t.creator.couponLimitHint}>
            <Input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
          </Field>

          <Field label={t.creator.couponExpires} hint={t.creator.couponExpiresHint}>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
        </div>

        <Button className="mt-4" loading={busy} disabled={!code.trim()} onClick={create}>
          <Icon name="plus" size={16} />
          {t.creator.couponCreate}
        </Button>
      </Card>

      {coupons && coupons.length > 0 && (
        <ul className="space-y-2.5">
          {coupons.map((coupon) => (
            <li key={coupon.id}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <span className="rounded-lg bg-surface-sunken px-2.5 py-1 font-mono text-[13px] font-bold tracking-wide text-ink">
                  {coupon.code}
                </span>
                <span className="text-[15px] font-bold text-ink">{describe(coupon)}</span>

                <span className="text-[13px] text-ink-muted">
                  {coupon.course ? coupon.course.title : t.creator.couponAllCourses}
                </span>

                <span className="text-[12px] tabular-nums text-ink-subtle">
                  {coupon.redeemedCount}
                  {coupon.maxRedemptions !== null && ` / ${coupon.maxRedemptions}`}{" "}
                  {t.creator.couponUsed}
                </span>

                {coupon.expiresAt && (
                  <span className="text-[12px] text-ink-subtle">
                    {t.creator.couponUntil} {formatDate(coupon.expiresAt, locale)}
                  </span>
                )}

                <Badge tone={coupon.isActive ? "success" : "neutral"} className="ms-auto">
                  {coupon.isActive ? t.creator.couponActive : t.creator.couponOff}
                </Badge>

                <Button size="sm" variant="ghost" onClick={() => toggle(coupon)}>
                  {coupon.isActive ? t.creator.couponTurnOff : t.creator.couponTurnOn}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger-700 hover:bg-danger-50"
                  onClick={() => setPendingDelete(coupon)}
                >
                  <Icon name="trash" size={14} />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {coupons && coupons.length === 0 && (
        <p className="py-6 text-center text-[14px] text-ink-muted">{t.creator.couponNone}</p>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        pending={busy}
        icon="trash"
        title={t.creator.couponDeleteTitle}
        body={t.creator.couponDeleteBody}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
