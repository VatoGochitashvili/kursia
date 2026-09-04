import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ReportActions } from "@/components/admin/ReportActions";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const { locale, t } = await getI18n();

  const reports = await db.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true, targetType: true, targetId: true, reason: true, details: true,
      status: true, resolution: true, createdAt: true,
      reporter: {
        select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } },
      },
      handler: { select: { profile: { select: { fullName: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title={t.admin.reports}
        subtitle={`${reports.filter((r) => r.status === "OPEN").length} ${
          locale === "en" ? "open" : "ღია"
        }`}
      />

      {reports.length === 0 ? (
        <EmptyState icon={<Icon name="alert" size={30} />} title={t.admin.noPending} />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar
                      src={report.reporter.profile?.avatarUrl}
                      name={report.reporter.profile?.fullName ?? "?"}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{report.targetType}</Badge>
                        <Badge
                          tone={
                            report.status === "OPEN"
                              ? "warn"
                              : report.status === "ACTIONED"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {report.status}
                        </Badge>
                        <span className="text-[11px] text-ink-subtle">
                          {formatDateTime(report.createdAt, locale)}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[13px] font-semibold text-ink">{report.reason}</p>
                      {report.details && (
                        <p className="mt-0.5 text-[13px] text-ink-muted">{report.details}</p>
                      )}
                      <p className="mt-1 font-mono text-[11px] text-ink-subtle">
                        {report.targetType}:{report.targetId}
                      </p>

                      {report.resolution && (
                        <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-[12px] text-ink-muted">
                          {report.resolution}
                          {report.handler?.profile?.fullName &&
                            ` — ${report.handler.profile.fullName}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {report.status === "OPEN" && (
                    <ReportActions
                      reportId={report.id}
                      labels={{
                        action: locale === "en" ? "Action taken" : "მიღებულია ზომები",
                        dismiss: locale === "en" ? "Dismiss" : "უარყოფა",
                        resolution: t.admin.reason,
                        submit: t.common.confirm,
                        cancel: t.common.cancel,
                      }}
                    />
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
