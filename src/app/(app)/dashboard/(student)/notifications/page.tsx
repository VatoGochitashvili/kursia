import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/layout/DashboardShell";
import { MarkAllReadButton } from "@/components/dashboard/MarkAllReadButton";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Visual grouping for notification types. */
const TYPE_ICON: Record<string, IconName> = {
  COURSE_PURCHASED: "creditCard",
  COURSE_SOLD: "wallet",
  COURSE_APPROVED: "check",
  COURSE_REJECTED: "alert",
  COURSE_CHANGES_REQUESTED: "edit",
  COURSE_PUBLISHED: "globe",
  COURSE_SUBMITTED: "send",
  NEW_REVIEW: "star",
  NEW_COMMENT: "message",
  COMMENT_REPLY: "message",
  NEW_STUDENT: "users",
  PAYMENT_SUCCEEDED: "check",
  PAYMENT_FAILED: "alert",
  REFUND_PROCESSED: "refresh",
  PAYOUT_REQUESTED: "bank",
  PAYOUT_PAID: "bank",
  PAYOUT_REJECTED: "alert",
  CERTIFICATE_ISSUED: "award",
  SECURITY_PASSWORD_CHANGED: "shield",
  CREATOR_VERIFIED: "check",
  ACCOUNT_SUSPENDED: "alert",
};

export default async function NotificationsPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, type: true, title: true, body: true,
      linkUrl: true, readAt: true, createdAt: true,
    },
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title={t.notifications.title}
        subtitle={unread > 0 ? `${unread} ${t.notifications.new}` : undefined}
        action={unread > 0 ? <MarkAllReadButton label={t.notifications.markAllRead} /> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={<Icon name="bell" size={30} />} title={t.notifications.empty} />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const content = (
              <Card
                className={cn(
                  "flex items-start gap-3 p-4 transition-colors",
                  notification.readAt ? "" : "border-brand-200 bg-brand-50/40",
                  notification.linkUrl && "hover:border-brand-300",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    notification.readAt
                      ? "bg-surface-sunken text-ink-subtle"
                      : "bg-brand-100 text-brand-700",
                  )}
                >
                  <Icon name={TYPE_ICON[notification.type] ?? "bell"} size={17} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{notification.title}</p>
                  {notification.body && (
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-muted">
                      {notification.body}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    <TimeAgo date={notification.createdAt} locale={locale} />
                  </p>
                </div>

                {!notification.readAt && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                )}
              </Card>
            );

            return (
              <li key={notification.id}>
                {notification.linkUrl ? (
                  <Link href={localePath(notification.linkUrl, locale)}>{content}</Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
