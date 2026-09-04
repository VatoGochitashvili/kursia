import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Avatar, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { locale, t } = await getI18n();
  const { page: pageParam } = await searchParams;

  const page = Math.max(Number(pageParam) || 1, 1);
  const perPage = 60;

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, action: true, targetType: true, targetId: true,
        summary: true, metadata: true, ip: true, createdAt: true,
        actor: {
          select: {
            email: true,
            role: true,
            profile: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    }),
    db.auditLog.count(),
  ]);

  const totalPages = Math.max(Math.ceil(total / perPage), 1);

  return (
    <>
      <PageHeader
        title={t.admin.auditLog}
        subtitle={
          locale === "en"
            ? "Append-only record of privileged actions and money movements."
            : "პრივილეგირებული მოქმედებებისა და ფინანსური ოპერაციების ჟურნალი."
        }
      />

      {entries.length === 0 ? (
        <EmptyState icon={<Icon name="shield" size={30} />} title={t.common.empty} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-3 p-4">
                <Avatar
                  src={entry.actor?.profile?.avatarUrl}
                  name={entry.actor?.profile?.fullName ?? "system"}
                  size={30}
                />

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-semibold text-ink">
                      {entry.actor?.profile?.fullName ?? entry.actor?.email ?? "system"}
                    </span>
                    <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
                      {entry.action}
                    </code>
                  </p>
                  {entry.summary && (
                    <p className="mt-0.5 text-[12px] text-ink-muted">{entry.summary}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-ink-subtle">
                    {formatDateTime(entry.createdAt, locale)}
                    {entry.targetType && ` · ${entry.targetType}`}
                    {entry.ip && ` · ${entry.ip}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 15) }).map((_, i) => (
            <a
              key={i}
              href={`?page=${i + 1}`}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-[13px] font-semibold ${
                i + 1 === page
                  ? "bg-brand-600 text-white"
                  : "border border-line-strong text-ink-muted hover:bg-surface-muted"
              }`}
            >
              {i + 1}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
