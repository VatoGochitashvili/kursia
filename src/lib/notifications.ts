import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { serializeObject } from "@/lib/json";
import { queueEmail } from "@/lib/email";
import type { EmailTemplate } from "@/lib/email";
import type { Locale, NotificationType } from "@/lib/enums";

/**
 * One call creates the in-app notification and, when the event warrants it,
 * queues the matching email. Notification text is stored already-localised to
 * the recipient's language, since it is a point-in-time record of an event.
 */

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  data?: Record<string, unknown>;
  email?: { template: EmailTemplate; payload: Record<string, string | number | undefined> };
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { email: true, locale: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") return;

    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
        data: serializeObject(input.data),
      },
    });

    if (input.email) {
      await queueEmail({
        to: user.email,
        template: input.email.template,
        payload: input.email.payload,
        locale: (user.locale === "en" ? "en" : "ka") as Locale,
      });
    }
  } catch (error) {
    // A notification failure must never roll back the business event.
    console.error("[notify] failed", input.type, error);
  }
}

/** Fan out one event to many recipients (e.g. followers of a creator). */
export async function notifyMany(userIds: string[], build: (userId: string) => NotifyInput) {
  await Promise.all(userIds.map((id) => notify(build(id))));
}

export const absoluteUrl = (path: string) =>
  `${env.APP_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, ids?: string[]): Promise<void> {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
