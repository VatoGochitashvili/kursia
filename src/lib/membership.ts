/**
 * Community membership: the vocabulary, with no database behind it.
 *
 * Kept free of `@/lib/db` on purpose — the checkout, the access check and the
 * React components that render a membership card all need the same words for
 * the same things, and a module that imports the database cannot cross to the
 * client.
 */

/** A subscription's scope key. See `Subscription.scopeKey` in the schema. */
export const courseScope = (courseId: string) => `course:${courseId}`;
export const communityScope = (creatorId: string) => `community:${creatorId}`;

/**
 * Purchase kinds that buy a period rather than a thing.
 *
 * Both extend a subscription at settlement; they differ only in what access
 * they produce, so every "is this a renewal?" question asks this.
 */
export const isRecurring = (kind: string) => kind === "SUBSCRIPTION" || kind === "COMMUNITY";

/**
 * What to call a creator's community.
 *
 * Groups are branded separately from the person running them — "Georgian
 * Traders" rather than "Giorgi Khutsishvili" — but most creators will not set
 * a name, so fall back to something that reads correctly in both languages
 * instead of showing an empty heading.
 */
export function communityLabel(
  creator: { communityName?: string | null; displayName: string } | null | undefined,
  locale: "ka" | "en" = "ka",
): string {
  if (!creator) return locale === "en" ? "Community" : "საზოგადოება";
  const named = creator.communityName?.trim();
  if (named) return named;
  return locale === "en"
    ? `${creator.displayName}'s community`
    : `${creator.displayName} — საზოგადოება`;
}

/** Is this subscription granting access right now? */
export function membershipIsLive(subscription: {
  status: string;
  currentPeriodEnd: Date | string;
}): boolean {
  if (subscription.status === "EXPIRED") return false;
  const end = new Date(subscription.currentPeriodEnd).getTime();
  return end > Date.now();
}
