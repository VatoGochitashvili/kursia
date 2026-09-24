import { db } from "@/lib/db";
import { listMyCircles } from "@/lib/my-circles";
import { getPreferences } from "@/lib/preferences";

/**
 * People meet each other inside circles, so a circle is what lets two of them
 * follow or write to one another. Strangers across the platform cannot: that
 * keeps a member's inbox to the rooms they chose to be in.
 */
export async function sharedCircleIds(a: string, b: string): Promise<string[]> {
  if (a === b) return [];
  const [mine, theirs] = await Promise.all([listMyCircles(a), listMyCircles(b)]);
  const theirIds = new Set(theirs.map((c) => c.creatorId));
  return mine.filter((c) => theirIds.has(c.creatorId)).map((c) => c.creatorId);
}

/**
 * Whether `from` may write to `to`: they share a circle now, or they already
 * have a conversation — somebody who leaves a circle can still answer a
 * message that reached them while they were in it.
 */
export async function canMessage(from: string, to: string): Promise<boolean> {
  if (from === to) return false;
  const recipient = await db.user.findUnique({ where: { id: to }, select: { status: true } });
  if (!recipient || recipient.status !== "ACTIVE") return false;

  // Somebody who has switched messages off is not writable to, even by
  // someone in the same circle.
  if (!(await getPreferences(to)).allowMessages) return false;

  const existing = await db.directMessage.findFirst({
    where: {
      OR: [
        { senderId: from, recipientId: to },
        { senderId: to, recipientId: from },
      ],
    },
    select: { id: true },
  });
  if (existing) return true;
  return (await sharedCircleIds(from, to)).length > 0;
}

export async function unreadMessageCount(userId: string): Promise<number> {
  return db.directMessage.count({ where: { recipientId: userId, readAt: null } });
}

export interface ConversationSummary {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lastBody: string;
  lastAt: Date;
  lastFromMe: boolean;
  unread: number;
}

/**
 * One row per person this user has exchanged messages with, newest first.
 *
 * Built from the most recent messages rather than a conversation table: the
 * inbox of one member is small, and reading the last few hundred messages is
 * cheaper than keeping a second table in step with the first.
 */
export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const messages = await db.directMessage.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { senderId: true, recipientId: true, body: true, createdAt: true, readAt: true },
  });

  const byPeer = new Map<string, Omit<ConversationSummary, "name" | "avatarUrl">>();
  for (const m of messages) {
    const peer = m.senderId === userId ? m.recipientId : m.senderId;
    const row = byPeer.get(peer);
    const unreadHere = m.recipientId === userId && !m.readAt ? 1 : 0;
    if (!row) {
      byPeer.set(peer, {
        userId: peer,
        lastBody: m.body,
        lastAt: m.createdAt,
        lastFromMe: m.senderId === userId,
        unread: unreadHere,
      });
    } else {
      row.unread += unreadHere;
    }
  }
  if (byPeer.size === 0) return [];

  const people = await db.user.findMany({
    where: { id: { in: [...byPeer.keys()] } },
    select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } },
  });
  const personById = new Map(people.map((p) => [p.id, p]));

  return [...byPeer.values()].map((row) => ({
    ...row,
    name: personById.get(row.userId)?.profile?.fullName ?? "—",
    avatarUrl: personById.get(row.userId)?.profile?.avatarUrl ?? null,
  }));
}
