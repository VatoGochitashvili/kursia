import { db } from "@/lib/db";

/**
 * Points and levels inside a creator's community.
 *
 * What earns points is deliberately weighted towards being useful to other
 * people rather than towards volume. Writing a post is worth more than a
 * reply; a like someone else gave you is worth more than either, because you
 * cannot award it to yourself. Finishing a lesson and turning up to a live
 * session count too — this is a course platform, not a forum.
 */
export const POINT_VALUES = {
  POST: 3,
  REPLY: 1,
  LIKE_RECEIVED: 2,
  LESSON_COMPLETED: 2,
  EVENT_ATTENDED: 5,
} as const;

export type PointKind = keyof typeof POINT_VALUES;

/**
 * Level thresholds, in total points.
 *
 * The curve steepens hard on purpose. The first few levels should arrive in
 * the first week — that is what makes someone come back — while the top ones
 * take a year of showing up, so a level badge means something when you see it
 * next to a name.
 */
const LEVELS = [0, 5, 20, 65, 155, 515, 1515, 4015, 10015] as const;

export interface Level {
  level: number;
  /** Points needed for the next level, or null at the top. */
  nextAt: number | null;
  /** 0–100 through the current level. 100 at the top. */
  progress: number;
}

export function levelFor(points: number): Level {
  let level = 1;
  for (let i = LEVELS.length - 1; i >= 0; i -= 1) {
    if (points >= LEVELS[i]!) {
      level = i + 1;
      break;
    }
  }

  const floor = LEVELS[level - 1]!;
  const nextAt = level < LEVELS.length ? LEVELS[level]! : null;
  // Floored, and capped at 99 short of the threshold: a bar that reads full
  // while you have not actually levelled up is a small lie, and it is the one
  // number on the page people watch.
  const progress =
    nextAt === null
      ? 100
      : Math.min(99, Math.max(0, Math.floor(((points - floor) / (nextAt - floor)) * 100)));

  return { level, nextAt, progress };
}

/**
 * Credit a member, once.
 *
 * The unique key is (community, member, source) — so a retried request, a
 * double-tapped like, or a lesson re-marked complete all land on the same row
 * and pay once. Failures are swallowed: points are a nicety layered on top of
 * an action that already succeeded, and nobody's post should fail to publish
 * because the scoreboard had a bad day.
 *
 * Returns whether a row was actually written, so a caller reporting a count
 * reports work done rather than attempts made.
 */
export async function award(input: {
  creatorId: string;
  userId: string;
  kind: PointKind;
  sourceType: string;
  sourceId: string;
}): Promise<boolean> {
  const { creatorId, userId, kind, sourceType, sourceId } = input;
  try {
    await db.pointEvent.create({
      data: { creatorId, userId, kind, points: POINT_VALUES[kind], sourceType, sourceId },
    });
    return true;
  } catch {
    // Already credited, or the ledger is unavailable. Either way, not fatal.
    return false;
  }
}

/** Take it back — an unliked post, an un-completed lesson. */
export async function revoke(input: {
  creatorId: string;
  userId: string;
  sourceType: string;
  sourceId: string;
}): Promise<void> {
  try {
    await db.pointEvent.deleteMany({ where: input });
  } catch {
    // Same reasoning as award().
  }
}

export type LeaderboardWindow = "7d" | "30d" | "all";

const WINDOW_MS: Record<LeaderboardWindow, number | null> = {
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  all: null,
};

export interface LeaderboardRow {
  userId: string;
  points: number;
  rank: number;
  name: string;
  avatarUrl: string | null;
  isCreator: boolean;
  /** Level is always lifetime, even on a weekly board. */
  level: number;
}

/**
 * The board for one window, plus where the viewer sits on it.
 *
 * A viewer outside the top N still gets their own row and their true rank, so
 * the board says "you are 47th" rather than quietly leaving them off it —
 * which is the only version of a leaderboard that motivates anybody who is
 * not already winning.
 */
export async function loadLeaderboard(input: {
  creatorId: string;
  window: LeaderboardWindow;
  viewerId: string | null;
  limit?: number;
}) {
  const { creatorId, window, viewerId } = input;
  const limit = input.limit ?? 20;
  const span = WINDOW_MS[window];

  const grouped = await db.pointEvent.groupBy({
    by: ["userId"],
    where: {
      creatorId,
      ...(span ? { createdAt: { gte: new Date(Date.now() - span) } } : {}),
    },
    _sum: { points: true },
  });

  const totals = grouped
    .map((row) => ({ userId: row.userId, points: row._sum.points ?? 0 }))
    .filter((row) => row.points > 0)
    // Ties break on id so the order is stable between requests rather than
    // shuffling every refresh.
    .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));

  const viewerIndex = viewerId ? totals.findIndex((r) => r.userId === viewerId) : -1;
  const top = totals.slice(0, limit);

  // The viewer's own row, if the top N does not already contain it.
  const needsViewer = viewerIndex >= limit;
  const wanted = needsViewer ? [...top, totals[viewerIndex]!] : top;

  if (wanted.length === 0) {
    return { rows: [] as LeaderboardRow[], viewer: null, total: 0 };
  }

  // Lifetime totals for the level badge — a weekly board still shows the
  // level someone actually reached, not a level implied by seven days.
  const lifetime = span
    ? await db.pointEvent.groupBy({
        by: ["userId"],
        where: { creatorId, userId: { in: wanted.map((r) => r.userId) } },
        _sum: { points: true },
      })
    : grouped;
  const lifetimeByUser = new Map(lifetime.map((r) => [r.userId, r._sum.points ?? 0]));

  const [users, creator] = await Promise.all([
    db.user.findMany({
      where: { id: { in: wanted.map((r) => r.userId) } },
      select: {
        id: true,
        profile: { select: { fullName: true, avatarUrl: true } },
        creatorProfile: { select: { id: true, displayName: true } },
      },
    }),
    db.creatorProfile.findUnique({ where: { id: creatorId }, select: { userId: true } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const toRow = (entry: { userId: string; points: number }, rank: number): LeaderboardRow => {
    const user = userById.get(entry.userId);
    return {
      userId: entry.userId,
      points: entry.points,
      rank,
      name: user?.creatorProfile?.displayName ?? user?.profile?.fullName ?? "—",
      avatarUrl: user?.profile?.avatarUrl ?? null,
      isCreator: user?.id === creator?.userId,
      level: levelFor(lifetimeByUser.get(entry.userId) ?? 0).level,
    };
  };

  return {
    rows: top.map((entry, i) => toRow(entry, i + 1)),
    viewer:
      viewerIndex >= 0 ? toRow(totals[viewerIndex]!, viewerIndex + 1) : null,
    total: totals.length,
  };
}

/** One member's standing — for a profile badge or the header of the board. */
export async function getStanding(creatorId: string, userId: string) {
  const sum = await db.pointEvent.aggregate({
    where: { creatorId, userId },
    _sum: { points: true },
  });
  const points = sum._sum.points ?? 0;
  return { points, ...levelFor(points) };
}
