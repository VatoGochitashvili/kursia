import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { canMessage } from "@/lib/social";
import { Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { MessageThread } from "@/components/messages/MessageThread";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ userId: string }>;
}

/**
 * One conversation. Reachable only for somebody you share a circle with, or
 * already talk to — the same rule the send endpoint enforces.
 */
export default async function ConversationPage({ params }: Props) {
  const { userId } = await params;
  const [{ locale, t }, user] = await Promise.all([getI18n(), requireUser()]);
  if (userId === user.id || !(await canMessage(user.id, userId))) notFound();

  const peer = await db.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { fullName: true, avatarUrl: true, headline: true } } },
  });
  if (!peer) notFound();
  const name = peer.profile?.fullName ?? "—";

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[26rem] flex-col">
      <div className="mb-3 flex items-center gap-3 border-b border-line pb-3">
        <Link
          href={localePath("/dashboard/messages", locale)}
          aria-label={t.messages.back}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <Icon name="arrowLeft" size={18} />
        </Link>
        <Avatar src={peer.profile?.avatarUrl} name={name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{name}</p>
          {peer.profile?.headline && (
            <p className="truncate text-[12.5px] text-ink-muted">{peer.profile.headline}</p>
          )}
        </div>
      </div>
      <MessageThread
        peerId={userId}
        labels={{
          placeholder: t.messages.placeholder,
          send: t.messages.send,
          empty: t.messages.threadEmpty,
        }}
      />
    </div>
  );
}
