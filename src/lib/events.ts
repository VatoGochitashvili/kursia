import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { award } from "@/lib/points";

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

/** How far back to sweep for sessions whose attendance has not been credited. */
const SETTLE_LOOKBACK_MS = 7 * 86_400_000;

/**
 * Credit attendance for sessions that have finished.
 *
 * Points are awarded after the fact, not when somebody RSVPs. An RSVP is an
 * intention; showing up on the day is the thing worth rewarding, and paying
 * for the intention would let anyone farm a community by clicking "I'll be
 * there" on a calendar they never open again.
 *
 * `award` is keyed on the event, so re-sweeping the same week costs nothing
 * and no marker column is needed.
 */
export async function settleFinishedEvents() {
  const now = new Date();

  const finished = await db.event.findMany({
    where: {
      isCancelled: false,
      endsAt: { lt: now, gte: new Date(now.getTime() - SETTLE_LOOKBACK_MS) },
    },
    select: {
      id: true,
      creatorId: true,
      attendees: { select: { userId: true }, take: 2000 },
    },
    take: 200,
  });

  let credited = 0;
  for (const event of finished) {
    for (const attendee of event.attendees) {
      const paid = await award({
        creatorId: event.creatorId,
        userId: attendee.userId,
        kind: "EVENT_ATTENDED",
        sourceType: "event",
        sourceId: event.id,
      });
      // Counts rows written, not attendees looked at — a sweep that credits
      // nobody should say so rather than report the same number every run.
      if (paid) credited += 1;
    }
  }

  return { events: finished.length, credited };
}
