"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export interface AdminUserView {
  id: string;
  email: string;
  role: string;
  status: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  creatorId: string | null;
  creatorSlug: string | null;
  isVerified: boolean;
  commissionPercent: number | null;
  courseCount: number;
  enrollmentCount: number;
  purchaseCount: number;
}

/**
 * One user row with inline admin actions.
 *
 * The admin's own row renders without destructive controls — the server
 * refuses self-modification anyway, but showing a button that always fails is
 * worse than not showing it.
 */
export function UserRow({
  user,
  isSelf,
  labels,
}: {
  user: AdminUserView;
  isSelf: boolean;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(user.role);
  const [commission, setCommission] = useState(
    user.commissionPercent === null ? "" : String(user.commissionPercent),
  );

  async function updateUser(patch: Record<string, unknown>, key: string) {
    setPending(key);
    setError(null);
    try {
      await api.patch(`/api/admin/users/${user.id}`, patch);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  async function updateCreator(patch: Record<string, unknown>, key: string) {
    if (!user.creatorId) return;
    setPending(key);
    setError(null);
    try {
      await api.patch(`/api/admin/creators/${user.creatorId}`, patch);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  const roleLabel =
    user.role === "ADMIN" ? labels.admin : user.role === "CREATOR" ? labels.creator : labels.student;

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar src={user.avatarUrl} name={user.fullName} size={40} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">{user.fullName}</span>
            <Badge tone={user.role === "ADMIN" ? "dark" : user.role === "CREATOR" ? "brand" : "neutral"}>
              {roleLabel}
            </Badge>
            {user.status === "SUSPENDED" && <Badge tone="danger">{labels.suspended}</Badge>}
            {user.creatorId && user.isVerified && (
              <span className="text-brand-500" title={labels.verify}>
                <Icon name="check" size={14} />
              </span>
            )}
            {!user.emailVerified && (
              <span className="text-warn-700" title={labels.unverified}>
                <Icon name="alert" size={13} />
              </span>
            )}
            {isSelf && <span className="text-[11px] text-ink-subtle">({labels.self})</span>}
          </div>

          <p className="mt-0.5 truncate text-[12px] text-ink-muted" dir="ltr">
            {user.email}
            {user.username && ` · @${user.username}`}
          </p>

          <p className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-ink-subtle">
            <span>
              {labels.memberSince} {user.createdAt}
            </span>
            {user.creatorId && (
              <span>
                {user.courseCount} {labels.courses}
              </span>
            )}
            <span>
              {user.enrollmentCount} {labels.enrolled}
            </span>
            {user.commissionPercent !== null && (
              <span className="font-semibold text-brand-600">
                {labels.commission}: {user.commissionPercent}%
              </span>
            )}
          </p>

          {error != null && (
            <Alert tone="danger" className="mt-2">
              {errorMessage(error)}
            </Alert>
          )}

          {editing && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-[12px] text-ink-muted">
                <span className="mb-1 block font-semibold">{labels.changeRole}</span>
                <Select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-40">
                  <option value="STUDENT">{labels.student}</option>
                  <option value="CREATOR">{labels.creator}</option>
                  <option value="ADMIN">{labels.admin}</option>
                </Select>
              </label>

              {user.creatorId && (
                <label className="text-[12px] text-ink-muted">
                  <span className="mb-1 block font-semibold">{labels.commission}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="—"
                    className="h-9 w-28"
                  />
                </label>
              )}

              <Button
                size="sm"
                loading={pending === "save"}
                onClick={async () => {
                  if (role !== user.role) await updateUser({ role }, "save");
                  if (user.creatorId) {
                    await updateCreator(
                      { commissionPercent: commission === "" ? null : Number(commission) },
                      "save",
                    );
                  }
                }}
              >
                {labels.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {labels.cancel}
              </Button>
            </div>
          )}
        </div>

        {!isSelf && !editing && (
          <div className="flex flex-wrap items-center gap-1.5">
            {user.creatorSlug && (
              <Link
                href={`/creator/${user.creatorSlug}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink"
                title={labels.profile}
              >
                <Icon name="external" size={15} />
              </Link>
            )}

            {user.creatorId && (
              <Button
                size="sm"
                variant={user.isVerified ? "ghost" : "outline"}
                loading={pending === "verify"}
                onClick={() => updateCreator({ isVerified: !user.isVerified }, "verify")}
              >
                <Icon name="check" size={14} />
                {user.isVerified ? labels.unverify : labels.verify}
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Icon name="settings" size={14} />
            </Button>

            <Button
              size="sm"
              variant={user.status === "SUSPENDED" ? "success" : "ghost"}
              loading={pending === "status"}
              onClick={() =>
                updateUser(
                  { status: user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" },
                  "status",
                )
              }
            >
              {user.status === "SUSPENDED" ? labels.reinstate : labels.suspend}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
