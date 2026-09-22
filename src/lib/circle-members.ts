import { db } from "@/lib/db";
import { levelFor } from "@/lib/points";

export type CircleRole = "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";

export interface CircleMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: CircleRole;
  joinedAt: Date;
  level: number;
  points: number;
}

/**
 * Everyone in a circle: the owner, the admins they appointed, paying members,
 * and anyone holding a live enrolment on one of the owner's courses.
 *
 * "Joined" is the earliest of those, so somebody who bought a course last year
 * and subscribed last week shows as a member since last year — which is how
 * long they have actually been in the room.
 */
export async function listCircleMembers(creatorId: string, take = 300): Promise<CircleMember[]> {
  const now = new Date();
  const [creator, subscriptions, enrolments, roles, bans] = await Promise.all([
    db.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { userId: true, createdAt: true },
    }),
    db.subscription.findMany({
      where: {
        creatorId,
        kind: "COMMUNITY",
        status: { in: ["ACTIVE", "CANCELLED"] },
        currentPeriodEnd: { gt: now },
      },
      select: { userId: true, createdAt: true },
      take,
    }),
    db.enrollment.findMany({
      where: {
        revokedAt: null,
        OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
        course: { creatorId },
      },
      select: { userId: true, createdAt: true },
      take,
    }),
    db.communityRole.findMany({
      where: { creatorId },
      select: { userId: true, role: true, createdAt: true },
    }),
    db.communityBan.findMany({ where: { creatorId }, select: { userId: true } }),
  ]);

  const joined = new Map<string, Date>();
  const note = (userId: string, at: Date) => {
    const previous = joined.get(userId);
    if (!previous || at < previous) joined.set(userId, at);
  };
  subscriptions.forEach((s) => note(s.userId, s.createdAt));
  enrolments.forEach((e) => note(e.userId, e.createdAt));
  roles.forEach((r) => note(r.userId, r.createdAt));
  if (creator) note(creator.userId, creator.createdAt);

  // Removed people are gone from the room, whatever still grants them access.
  for (const ban of bans) joined.delete(ban.userId);

  const ids = [...joined.keys()];
  if (ids.length === 0) return [];

  const [users, points] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: {
        id: true,
        profile: { select: { fullName: true, avatarUrl: true } },
        creatorProfile: { select: { displayName: true } },
      },
    }),
    db.pointEvent.groupBy({
      by: ["userId"],
      where: { creatorId, userId: { in: ids } },
      _sum: { points: true },
    }),
  ]);

  const pointsByUser = new Map(points.map((p) => [p.userId, p._sum.points ?? 0]));
  const roleByUser = new Map(roles.map((r) => [r.userId, r.role]));
  const order: Record<CircleRole, number> = { OWNER: 0, ADMIN: 1, MODERATOR: 2, MEMBER: 3 };

  return users
    .map((user) => {
      const assigned = roleByUser.get(user.id);
      const role: CircleRole =
        user.id === creator?.userId
          ? "OWNER"
          : assigned === "ADMIN"
            ? "ADMIN"
            : assigned === "MODERATOR"
              ? "MODERATOR"
              : "MEMBER";
      const total = pointsByUser.get(user.id) ?? 0;
      return {
        userId: user.id,
        name:
          (role === "OWNER" ? user.creatorProfile?.displayName : null) ??
          user.profile?.fullName ??
          "—",
        avatarUrl: user.profile?.avatarUrl ?? null,
        role,
        joinedAt: joined.get(user.id)!,
        level: levelFor(total).level,
        points: total,
      };
    })
    .sort(
      (a, b) =>
        order[a.role] - order[b.role] || b.points - a.points || a.name.localeCompare(b.name),
    );
}
