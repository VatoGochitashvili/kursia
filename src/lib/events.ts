import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";

/** How far ahead of a session we nudge the people who said they'd come. */
const REMINDER_WINDOW_MS = 60 * 60_000;

/**
 * Reminders for live sessions.
 *
 * Called from the cron job. It reminds attendees — not every member — because
 * a reminder is only useful to someone who already planned to be there.
 *
 * The guard is `remindedAt` on the attendee row rather than a flag on the
 * event, so somebody who signs up twenty minutes before the start still gets
 * their nudge instead of missing a reminder that was already "sent" to an
 * earlier crowd.
 *
 * Each row is claimed with a conditional write before the notification goes
 * out, so two overlapping cron runs cannot both send. Losing a reminder if the
 * process dies mid-run is the better failure: the event is still on the
 * calendar, whereas a duplicate is noise in someone's inbox.
 */
export async function runEventReminders() {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const due = await db.eventAttendee.findMany({
    where: {
      remindedAt: null,
      event: {
        isCancelled: false,
        startsAt: { gt: now, lte: horizon },
      },
      user: { status: "ACTIVE" },
    },
    select: {
      id: true,
      userId: true,
      event: {
        select: {
          title: true,
          startsAt: true,
          joinUrl: true,
          creator: { select: { slug: true } },
        },
      },
    },
    take: 500,
  });

  let sent = 0;

  for (const row of due) {
    // Claim it. If another run got there first this updates nothing and we
    // skip, rather than sending a second copy.
    const claimed = await db.eventAttendee.updateMany({
      where: { id: row.id, remindedAt: null },
      data: { remindedAt: now },
    });
    if (claimed.count === 0) continue;

    const minutes = Math.max(
      1,
      Math.round((row.event.startsAt.getTime() - now.getTime()) / 60_000),
    );

    const ok = await notify({
      userId: row.userId,
      type: "EVENT_REMINDER",
      title: `შეხვედრა ${minutes} წუთში`,
      body: row.event.title,
      linkUrl: `/community/${row.event.creator.slug}/events`,
    })
      .then(() => true)
      .catch(() => false);

    if (ok) sent += 1;
  }

  return { due: due.length, sent };
}
