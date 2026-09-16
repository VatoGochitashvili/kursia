import { db } from "@/lib/db";
import { communityLabel } from "@/lib/membership";
import type { Locale } from "@/lib/enums";

export interface MyCircle {
  creatorId: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  memberCount: number;
  /** How this person is in it, which decides the badge beside the name. */
  role: "OWNER" | "ADMIN" | "MEMBER";
}

/**
 * The circles one person belongs to.
 *
 * Every way in counts: the circle they own, one they help run, one they pay
 * for, and one they reached by buying a course from its owner. Anything less
 * would leave somebody staring at a launcher that does not list the room they
 * are standing in.
 *
 * Asked as one query with an OR rather than four queries merged in memory, so
 * paging and ordering stay the database's job.
 */
export async function listMyCircles(
  userId: string | null,
  locale: Locale = "ka",
  take = 50,
): Promise<MyCircle[]> {
  if (!userId) return [];
  const now = new Date();

  const rows = await db.creatorProfile.findMany({
    where: {
      communityEnabled: true,
      OR: [
        { userId },
        { communityRoles: { some: { userId } } },
        {
          subscriptions: {
            some: {
              userId,
              kind: "COMMUNITY",
              status: { in: ["ACTIVE", "CANCELLED"] },
              currentPeriodEnd: { gt: now },
            },
          },
        },
        {
          courses: {
            some: {
              enrollments: {
                some: {
                  userId,
                  revokedAt: null,
                  OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
                },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ communityMemberCount: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      slug: true,
      userId: true,
      displayName: true,
      communityName: true,
      communityCoverUrl: true,
      communityMemberCount: true,
      communityRoles: { where: { userId }, select: { role: true } },
    },
  });

  return rows.map((row) => ({
    creatorId: row.id,
    slug: row.slug,
    name: communityLabel(
      { communityName: row.communityName, displayName: row.displayName },
      locale,
    ),
    coverUrl: row.communityCoverUrl,
    memberCount: row.communityMemberCount,
    role:
      row.userId === userId
        ? ("OWNER" as const)
        : row.communityRoles[0]?.role === "ADMIN"
          ? ("ADMIN" as const)
          : ("MEMBER" as const),
  }));
}
