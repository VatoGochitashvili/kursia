import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, hashToken, randomToken } from "@/lib/crypto";
import { normalizeUsername, slugify, uniqueSlug } from "@/lib/slug";
import { queueEmail } from "@/lib/email";
import { notify, absoluteUrl } from "@/lib/notifications";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { ApiError, conflict } from "@/lib/api";
import type { Locale } from "@/lib/enums";

/**
 * Account lifecycle: creation, verification, password reset, creator upgrade.
 * Kept out of the route handlers so the same logic serves the web forms and,
 * later, a native mobile client.
 */

export const TOKEN_TTL = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
} as const;

async function uniqueUsername(seed: string): Promise<string> {
  const base = normalizeUsername(seed) || "user";
  return uniqueSlug(
    base,
    async (candidate) => (await db.profile.count({ where: { username: candidate } })) > 0,
    { maxLength: 30, fallbackPrefix: "user" },
  );
}

async function uniqueCreatorSlug(displayName: string): Promise<string> {
  return uniqueSlug(
    displayName,
    async (candidate) => (await db.creatorProfile.count({ where: { slug: candidate } })) > 0,
    { maxLength: 60, fallbackPrefix: "creator" },
  );
}

/** Issue a single-use token; only its hash is stored. */
export async function issueToken(
  userId: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
): Promise<string> {
  // Older tokens for the same purpose are burned, so a leaked earlier email
  // cannot be replayed after a new request.
  await db.verificationToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomToken(32);
  await db.verificationToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]),
    },
  });
  return token;
}

export async function consumeToken(
  token: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
): Promise<{ userId: string } | null> {
  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, purpose: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }
  await db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { userId: record.userId };
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  accountType: "STUDENT" | "CREATOR";
  displayName?: string;
  locale: Locale;
}

export async function registerAccount(input: RegisterInput): Promise<{ userId: string }> {
  const settings = await getSettings();
  if (!settings.registrationOpen) {
    throw new ApiError(403, "REGISTRATION_CLOSED", "რეგისტრაცია დროებით დახურულია");
  }
  if (input.accountType === "CREATOR" && !settings.creatorRegistrationOpen) {
    throw new ApiError(403, "REGISTRATION_CLOSED", "ინსტრუქტორის რეგისტრაცია დროებით დახურულია");
  }

  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw conflict("ეს ელფოსტა უკვე გამოყენებულია");

  const [passwordHash, username] = await Promise.all([
    hashPassword(input.password),
    uniqueUsername(input.fullName || input.email.split("@")[0]!),
  ]);

  const isCreator = input.accountType === "CREATOR";
  const displayName = (input.displayName?.trim() || input.fullName).slice(0, 120);
  const creatorSlug = isCreator ? await uniqueCreatorSlug(displayName) : null;

  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: isCreator ? "CREATOR" : "STUDENT",
      locale: input.locale,
      profile: { create: { fullName: input.fullName, username } },
      ...(isCreator && creatorSlug
        ? {
            creatorProfile: {
              create: {
                slug: creatorSlug,
                displayName,
                // Verification is an editorial decision, never automatic.
                isVerified: false,
                approvedAt: settings.creatorAutoApprove ? new Date() : null,
                balance: { create: { currency: settings.currency } },
              },
            },
          }
        : {}),
    },
    select: { id: true, email: true },
  });

  const token = await issueToken(user.id, "EMAIL_VERIFY");
  await queueEmail({
    to: user.email,
    template: "verifyEmail",
    locale: input.locale,
    payload: {
      name: input.fullName,
      url: absoluteUrl(`/verify-email?token=${token}`),
    },
  });

  return { userId: user.id };
}

/** Upgrade an existing student to a creator account. */
export async function becomeCreator(input: {
  userId: string;
  displayName: string;
  instructorBio?: string;
  expertise?: string[];
}): Promise<{ slug: string }> {
  const settings = await getSettings();
  if (!settings.creatorRegistrationOpen) {
    throw new ApiError(403, "REGISTRATION_CLOSED", "ინსტრუქტორის რეგისტრაცია დროებით დახურულია");
  }

  const existing = await db.creatorProfile.findUnique({
    where: { userId: input.userId },
    select: { slug: true },
  });
  if (existing) return { slug: existing.slug };

  const slug = await uniqueCreatorSlug(input.displayName);

  await db.$transaction([
    db.creatorProfile.create({
      data: {
        userId: input.userId,
        slug,
        displayName: input.displayName,
        instructorBio: input.instructorBio ?? null,
        expertise: input.expertise?.length ? JSON.stringify(input.expertise) : null,
        approvedAt: settings.creatorAutoApprove ? new Date() : null,
        balance: { create: { currency: settings.currency } },
      },
    }),
    // Admins keep ADMIN; students are promoted to CREATOR.
    db.user.updateMany({
      where: { id: input.userId, role: "STUDENT" },
      data: { role: "CREATOR" },
    }),
  ]);

  await audit({
    actorId: input.userId,
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    targetType: "User",
    targetId: input.userId,
    summary: "STUDENT → CREATOR (self-service)",
  });

  return { slug };
}

export async function startPasswordReset(email: string, locale: Locale): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true, profile: { select: { fullName: true } } },
  });

  // Always succeed from the caller's point of view — revealing which addresses
  // have accounts is an enumeration vector.
  if (!user || user.status !== "ACTIVE") return;

  const token = await issueToken(user.id, "PASSWORD_RESET");
  await queueEmail({
    to: user.email,
    template: "passwordReset",
    locale,
    payload: {
      name: user.profile?.fullName ?? "",
      url: absoluteUrl(`/reset-password?token=${token}`),
    },
  });
}

export async function completePasswordReset(token: string, password: string): Promise<boolean> {
  const consumed = await consumeToken(token, "PASSWORD_RESET");
  if (!consumed) return false;

  const passwordHash = await hashPassword(password);
  await db.user.update({ where: { id: consumed.userId }, data: { passwordHash } });

  // A password change invalidates every existing session on every device.
  await db.session.updateMany({
    where: { userId: consumed.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await notify({
    userId: consumed.userId,
    type: "SECURITY_PASSWORD_CHANGED",
    title: "პაროლი შეიცვალა",
    body: "ყველა მოწყობილობაზე სესია დასრულდა.",
    email: { template: "passwordChanged", payload: {} },
  });

  return true;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const consumed = await consumeToken(token, "EMAIL_VERIFY");
  if (!consumed) return false;

  const user = await db.user.update({
    where: { id: consumed.userId },
    data: { emailVerified: new Date() },
    select: { email: true, locale: true, profile: { select: { fullName: true } } },
  });

  await queueEmail({
    to: user.email,
    template: "welcome",
    locale: (user.locale === "en" ? "en" : "ka") as Locale,
    payload: {
      name: user.profile?.fullName ?? "",
      url: absoluteUrl("/courses"),
    },
  });

  return true;
}

export async function resendVerification(userId: string, locale: Locale): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true, profile: { select: { fullName: true } } },
  });
  if (!user || user.emailVerified) return;

  const token = await issueToken(userId, "EMAIL_VERIFY");
  await queueEmail({
    to: user.email,
    template: "verifyEmail",
    locale,
    payload: {
      name: user.profile?.fullName ?? "",
      url: absoluteUrl(`/verify-email?token=${token}`),
    },
  });
}

export const supportEmail = env.PLATFORM_SUPPORT_EMAIL;
export { slugify };
