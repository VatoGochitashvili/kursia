import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { bpsToPercent } from "@/lib/money";
import { PageHeader } from "@/components/layout/DashboardShell";
import { UserRow } from "@/components/admin/UserRow";
import { SearchBar } from "@/components/layout/SearchBar";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Users", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; status?: string }>;
}) {
  const admin = await requireAdmin();
  const { locale, t } = await getI18n();
  const { role, q, status } = await searchParams;

  const users = await db.user.findMany({
    where: {
      ...(role && ["STUDENT", "CREATOR", "ADMIN"].includes(role) ? { role } : {}),
      ...(status && ["ACTIVE", "SUSPENDED"].includes(status) ? { status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { profile: { fullName: { contains: q } } },
              { profile: { username: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, email: true, role: true, status: true, createdAt: true,
      emailVerified: true, lastLoginAt: true,
      profile: { select: { fullName: true, username: true, avatarUrl: true } },
      creatorProfile: {
        select: {
          id: true, slug: true, isVerified: true, commissionBpsOverride: true,
          _count: { select: { courses: true } },
        },
      },
      _count: { select: { enrollments: true, purchases: true } },
    },
  });

  const p = (path: string) => localePath(path, locale);
  const roleFilters = [
    { value: "", label: t.common.all },
    { value: "STUDENT", label: t.admin.totalStudents },
    { value: "CREATOR", label: t.admin.totalCreators },
    { value: "ADMIN", label: t.nav.admin },
  ];

  return (
    <>
      <PageHeader title={t.admin.users} subtitle={`${users.length}`} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {roleFilters.map((filter) => (
            <Link
              key={filter.value}
              href={filter.value ? `?role=${filter.value}` : "?"}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                (role ?? "") === filter.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-line-strong text-ink-muted hover:bg-surface-muted",
              )}
            >
              {filter.label}
            </Link>
          ))}
          <Link
            href="?status=SUSPENDED"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
              status === "SUSPENDED"
                ? "border-danger-500 bg-danger-50 text-danger-700"
                : "border-line-strong text-ink-muted hover:bg-surface-muted",
            )}
          >
            {t.admin.suspend}
          </Link>
        </div>

        <div className="ms-auto w-full max-w-xs">
          <SearchBar
            placeholder={t.common.search}
            defaultValue={q ?? ""}
            action={p("/admin/users")}
          />
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Icon name="users" size={30} />} title={t.common.empty} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={{
                  id: user.id,
                  email: user.email,
                  role: user.role,
                  status: user.status,
                  fullName: user.profile?.fullName ?? user.email,
                  username: user.profile?.username ?? "",
                  avatarUrl: user.profile?.avatarUrl ?? null,
                  emailVerified: Boolean(user.emailVerified),
                  createdAt: formatDate(user.createdAt, locale),
                  lastLoginAt: user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : null,
                  creatorId: user.creatorProfile?.id ?? null,
                  creatorSlug: user.creatorProfile?.slug ?? null,
                  isVerified: user.creatorProfile?.isVerified ?? false,
                  commissionPercent:
                    user.creatorProfile?.commissionBpsOverride != null
                      ? bpsToPercent(user.creatorProfile.commissionBpsOverride)
                      : null,
                  courseCount: user.creatorProfile?._count.courses ?? 0,
                  enrollmentCount: user._count.enrollments,
                  purchaseCount: user._count.purchases,
                }}
                isSelf={user.id === admin.id}
                labels={{
                  student: t.admin.totalStudents,
                  creator: t.admin.totalCreators,
                  admin: t.nav.admin,
                  suspend: t.admin.suspend,
                  reinstate: t.admin.reinstate,
                  verify: t.admin.verify,
                  unverify: t.admin.unfeature,
                  changeRole: t.admin.changeRole,
                  commission: t.admin.commission,
                  save: t.common.save,
                  cancel: t.common.cancel,
                  courses: t.nav.courses,
                  enrolled: t.common.students,
                  memberSince: t.profile.memberSince.replace("{date}", ""),
                  suspended: t.auth.accountSuspended,
                  unverified: t.auth.verifyEmailTitle,
                  profile: t.profile.publicProfile,
                  self: locale === "en" ? "You" : "თქვენ",
                }}
              />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
