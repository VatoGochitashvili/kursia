import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";

export const runtime = "nodejs";

/** A million tetri — 10,000 GEL a month. Past this it is a typo, not a price. */
const MAX_PRICE_MINOR = 1_000_000;

const settingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    name: z.string().trim().max(80).nullable().optional(),
    tagline: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    coverUrl: z.union([z.string().trim().url().max(1000), z.literal("")]).nullable().optional(),
    priceMinor: z.number().int().min(0).max(MAX_PRICE_MINOR).optional(),
    /** Which of the creator's courses come with the membership. */
    includedCourseIds: z.array(z.string().trim().max(40)).max(200).optional(),
  })
  .strict();

/**
 * A creator configuring their own community.
 *
 * Only ever their own: the creator profile is resolved from the session, not
 * from the request body, so there is no id to tamper with.
 *
 * Changing the price does not touch anybody's current period. Every
 * subscription stores the money it agreed to, so a rise applies to the next
 * month somebody chooses to buy and never to one already paid for.
 */
export const PATCH = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);

  const creator = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!creator) throw new ApiError(403, "FORBIDDEN", "ავტორის პროფილი არ გაქვთ");

  const body = await readJson(request, settingsSchema);

  const updated = await db.creatorProfile.update({
    where: { id: creator.id },
    data: {
      ...(body.enabled !== undefined ? { communityEnabled: body.enabled } : {}),
      ...(body.name !== undefined ? { communityName: body.name || null } : {}),
      ...(body.tagline !== undefined ? { communityTagline: body.tagline || null } : {}),
      ...(body.description !== undefined ? { communityDescription: body.description || null } : {}),
      ...(body.coverUrl !== undefined ? { communityCoverUrl: body.coverUrl || null } : {}),
      ...(body.priceMinor !== undefined ? { communityPriceMinor: body.priceMinor } : {}),
    },
    select: {
      id: true, communityEnabled: true, communityName: true, communityTagline: true,
      communityDescription: true, communityCoverUrl: true, communityPriceMinor: true,
      communityCurrency: true, communityMemberCount: true,
    },
  });

  // Course inclusion is set as a whole list rather than per course, so the
  // two writes cannot disagree: everything named is in, everything else of
  // theirs is out. Scoped to this creator's own courses, so a stray id from
  // somebody else's catalogue changes nothing.
  if (body.includedCourseIds) {
    const ids = body.includedCourseIds;
    await db.course.updateMany({
      where: { creatorId: creator.id, id: { in: ids } },
      data: { includedInMembership: true },
    });
    await db.course.updateMany({
      where: { creatorId: creator.id, id: { notIn: ids } },
      data: { includedInMembership: false },
    });
  }

  return jsonOk({ community: updated });
});
