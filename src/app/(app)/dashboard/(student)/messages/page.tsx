import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { listConversations } from "@/lib/social";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Avatar, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Everyone this person has written to or heard from, newest conversation first. */
export default async function MessagesPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <PageHeader title={t.messages.title} />
      {conversations.length === 0 ? (
        <EmptyState icon={<Icon name="message" size={30} />} title={t.messages.empty} />
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {conversations.map((c) => (
              <li key={c.userId} className="border-b border-line last:border-b-0">
                <Link
                  href={p(`/dashboard/messages/${c.userId}`)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/60",
                    c.unread > 0 && "bg-brand-50/40",
                  )}
                >
                  <Avatar src={c.avatarUrl} name={c.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-[14px]", c.unread > 0 ? "font-bold" : "font-semibold")}>
                        {c.name}
                      </span>
                      <TimeAgo date={c.lastAt} locale={locale} className="shrink-0 text-[12px] text-ink-subtle" />
                    </p>
                    <p className={cn("truncate text-[13px]", c.unread > 0 ? "text-ink" : "text-ink-muted")}>
                      {c.lastFromMe && <span className="text-ink-subtle">{t.messages.you} </span>}
                      {c.lastBody}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
