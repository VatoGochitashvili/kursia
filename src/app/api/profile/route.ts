import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonOk, readJson } from "@/lib/api";
import { updateProfileSchema, updateCreatorProfileSchema, becomeCreatorSchema } from "@/lib/validation";
import { requireUser, requireCreator } from "@/lib/auth/rbac";
import { becomeCreator } from "@/lib/auth/accounts";
import { serializeStringArray } from "@/lib/json";

export const runtime = "nodejs";

/** Update the caller's own profile. Role and status are NOT editable here. */
export const PATCH = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, updateProfileSchema);

  if (body.username) {
    const taken = await db.profile.findFirst({
      where: { username: body.username, NOT: { userId: user.id } },
      select: { id: true },
    });
    if (taken) throw conflict("ეს მომხმარებლის სახელი დაკავებულია");
  }

  // Empty strings clear optional URLs rather than storing "".
  const nullable = (value: string | undefined) =>
    value === undefined ? undefined : value === "" ? null : value;

  const profile = await db.profile.update({
    where: { userId: user.id },
    data: {
      fullName: body.fullName,
      username: body.username,
      bio: nullable(body.bio),
      headline: nullable(body.headline),
      city: nullable(body.city),
      phone: nullable(body.phone),
      avatarUrl: nullable(body.avatarUrl),
      websiteUrl: nullable(body.websiteUrl),
      facebookUrl: nullable(body.facebookUrl),
      youtubeUrl: nullable(body.youtubeUrl),
      linkedinUrl: nullable(body.linkedinUrl),
      instagramUrl: nullable(body.instagramUrl),
    },
    select: { id: true, fullName: true, username: true, avatarUrl: true },
  });

  if (body.locale) {
    await db.user.update({ where: { id: user.id }, data: { locale: body.locale } });
  }

  return jsonOk(profile);
});

/** Upgrade a student account to a creator account. */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, becomeCreatorSchema);

  const result = await becomeCreator({
    userId: user.id,
    displayName: body.displayName,
    instructorBio: body.instructorBio,
    expertise: body.expertise,
  });

  return jsonOk({ ok: true, slug: result.slug, redirectTo: "/dashboard/creator" });
});

/** Update creator-specific public fields. */
export const PUT = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);
  const body = await readJson(request, updateCreatorProfileSchema);

  const updated = await db.creatorProfile.update({
    where: { id: creator.creatorId },
    data: {
      displayName: body.displayName,
      instructorBio: body.instructorBio === "" ? null : body.instructorBio,
      expertise: body.expertise ? serializeStringArray(body.expertise) : undefined,
      legalName: body.legalName === "" ? null : body.legalName,
      taxId: body.taxId === "" ? null : body.taxId,
    },
    select: { id: true, slug: true, displayName: true },
  });

  return jsonOk(updated);
});
