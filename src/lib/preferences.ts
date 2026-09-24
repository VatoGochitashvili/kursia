import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/enums";

/**
 * One person's settings for mail and privacy.
 *
 * Defaults live here rather than in the database, so an account that has
 * never opened settings needs no row and adding a preference needs no
 * backfill. A row appears the first time somebody changes something.
 */
export interface Preferences {
  emailMessages: boolean;
  emailCircle: boolean;
  emailEvents: boolean;
  emailPurchases: boolean;
  emailProduct: boolean;
  allowMessages: boolean;
  showMemberships: boolean;
  showOnLeaderboard: boolean;
}

export const PREFERENCE_DEFAULTS: Preferences = {
  emailMessages: true,
  emailCircle: true,
  emailEvents: true,
  emailPurchases: true,
  // Opt-in, because it is the only one that is marketing rather than a
  // record of something that happened to them.
  emailProduct: false,
  allowMessages: true,
  showMemberships: true,
  showOnLeaderboard: true,
};

export async function getPreferences(userId: string): Promise<Preferences> {
  const row = await db.userPreference.findUnique({
    where: { userId },
    select: {
      emailMessages: true,
      emailCircle: true,
      emailEvents: true,
      emailPurchases: true,
      emailProduct: true,
      allowMessages: true,
      showMemberships: true,
      showOnLeaderboard: true,
    },
  });
  return row ?? PREFERENCE_DEFAULTS;
}

export async function savePreferences(
  userId: string,
  patch: Partial<Preferences>,
): Promise<Preferences> {
  const row = await db.userPreference.upsert({
    where: { userId },
    create: { userId, ...PREFERENCE_DEFAULTS, ...patch },
    update: patch,
    select: {
      emailMessages: true,
      emailCircle: true,
      emailEvents: true,
      emailPurchases: true,
      emailProduct: true,
      allowMessages: true,
      showMemberships: true,
      showOnLeaderboard: true,
    },
  });
  return row;
}

/**
 * Which switch governs a given notification's email.
 *
 * Anything not listed here is transactional in the strict sense — a password
 * changed, an account suspended — and is sent whatever the settings say,
 * because silencing it would hide something the person needs to act on.
 */
const EMAIL_SWITCH: Partial<Record<NotificationType, keyof Preferences>> = {
  NEW_COMMENT: "emailCircle",
  COMMENT_REPLY: "emailCircle",
  NEW_STUDENT: "emailCircle",
  NEW_REVIEW: "emailCircle",
  COMMUNITY_JOIN_REQUEST: "emailCircle",
  COMMUNITY_ROLE: "emailCircle",
  COMMUNITY_REVIEWED: "emailCircle",
  MEMBERSHIP_STARTED: "emailPurchases",
  MEMBERSHIP_SOLD: "emailPurchases",
  MEMBERSHIP_ENDING: "emailPurchases",
  COURSE_PURCHASED: "emailPurchases",
  COURSE_SOLD: "emailPurchases",
  PAYMENT_SUCCEEDED: "emailPurchases",
  SUBSCRIPTION_ENDING: "emailPurchases",
  EVENT_SCHEDULED: "emailEvents",
  EVENT_CANCELLED: "emailEvents",
  EVENT_REMINDER: "emailEvents",
  ANNOUNCEMENT: "emailProduct",
};

/** Whether this person wants the email that goes with this notification. */
export async function wantsEmail(userId: string, type: NotificationType): Promise<boolean> {
  const key = EMAIL_SWITCH[type];
  if (!key) return true;
  const preferences = await getPreferences(userId);
  return preferences[key];
}
