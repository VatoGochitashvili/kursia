import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Runtime, admin-editable configuration. Business rules (commission, branding,
 * approval requirements, currency) are NEVER hard-coded — they resolve as:
 *
 *   PlatformSetting row  →  environment default  →  code default
 *
 * Values are cached in-process for a short TTL so a homepage render does not
 * issue a query per setting.
 */

export interface PlatformSettings {
  platformName: string;
  platformNameKa: string;
  taglineKa: string;
  taglineEn: string;
  logoUrl: string;
  supportEmail: string;
  currency: string;
  commissionBps: number;
  payoutClearingDays: number;
  payoutMinimumMinor: number;
  refundWindowDays: number;
  /** When true, a creator cannot self-publish; admin approval is required. */
  courseApprovalRequired: boolean;
  registrationOpen: boolean;
  creatorRegistrationOpen: boolean;
  creatorAutoApprove: boolean;
  /** Homepage section keys, in render order. Admin-reorderable. */
  homepageSections: string[];
  featuredCourseIds: string[];
  featuredCreatorIds: string[];
  paymentProviders: string[];
  defaultPaymentProvider: string;
  seoDefaultTitleKa: string;
  seoDefaultDescriptionKa: string;
}

export const SETTING_DEFAULTS: PlatformSettings = {
  platformName: env.PLATFORM_NAME,
  platformNameKa: env.PLATFORM_NAME_KA,
  taglineKa: env.PLATFORM_TAGLINE_KA,
  taglineEn: "Learn. Create. Earn.",
  logoUrl: "",
  supportEmail: env.PLATFORM_SUPPORT_EMAIL,
  currency: env.DEFAULT_CURRENCY,
  commissionBps: env.DEFAULT_COMMISSION_BPS,
  payoutClearingDays: env.PAYOUT_CLEARING_DAYS,
  payoutMinimumMinor: env.PAYOUT_MINIMUM_MINOR,
  refundWindowDays: env.REFUND_WINDOW_DAYS,
  courseApprovalRequired: true,
  registrationOpen: true,
  creatorRegistrationOpen: true,
  creatorAutoApprove: false,
  homepageSections: [
    "hero",
    "categories",
    "featured",
    "popular",
    "new",
    "creators",
    "howItWorks",
    "studentBenefits",
    "creatorBenefits",
    "testimonials",
    "faq",
    "creatorCta",
  ],
  featuredCourseIds: [],
  featuredCreatorIds: [],
  paymentProviders: env.PAYMENT_PROVIDERS,
  defaultPaymentProvider: env.PAYMENT_DEFAULT_PROVIDER,
  seoDefaultTitleKa: "ონლაინ კურსები ქართულად",
  seoDefaultDescriptionKa:
    "აღმოაჩინე ქართული და საერთაშორისო ონლაინ კურსები — ბიზნესი, პროგრამირება, დიზაინი, მარკეტინგი და სხვა. ისწავლე შენი ტემპით.",
};

type Key = keyof PlatformSettings;

const VALUE_TYPES: Record<Key, "string" | "number" | "boolean" | "json"> = {
  platformName: "string", platformNameKa: "string", taglineKa: "string",
  taglineEn: "string", logoUrl: "string", supportEmail: "string",
  currency: "string", commissionBps: "number", payoutClearingDays: "number",
  payoutMinimumMinor: "number", refundWindowDays: "number",
  courseApprovalRequired: "boolean", registrationOpen: "boolean",
  creatorRegistrationOpen: "boolean", creatorAutoApprove: "boolean",
  homepageSections: "json", featuredCourseIds: "json", featuredCreatorIds: "json",
  paymentProviders: "json", defaultPaymentProvider: "string",
  seoDefaultTitleKa: "string", seoDefaultDescriptionKa: "string",
};

const GROUPS: Record<Key, string> = {
  platformName: "branding", platformNameKa: "branding", taglineKa: "branding",
  taglineEn: "branding", logoUrl: "branding", supportEmail: "branding",
  currency: "commerce", commissionBps: "commerce", payoutClearingDays: "commerce",
  payoutMinimumMinor: "commerce", refundWindowDays: "commerce",
  courseApprovalRequired: "moderation", registrationOpen: "access",
  creatorRegistrationOpen: "access", creatorAutoApprove: "access",
  homepageSections: "homepage", featuredCourseIds: "homepage",
  featuredCreatorIds: "homepage", paymentProviders: "payments",
  defaultPaymentProvider: "payments", seoDefaultTitleKa: "seo",
  seoDefaultDescriptionKa: "seo",
};

const CACHE_MS = 15_000;
let cache: { at: number; value: PlatformSettings } | null = null;

function decode(key: Key, raw: string): unknown {
  switch (VALUE_TYPES[key]) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : SETTING_DEFAULTS[key];
    }
    case "boolean":
      return raw === "true" || raw === "1";
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        return SETTING_DEFAULTS[key];
      }
    default:
      return raw;
  }
}

export function encodeSetting(key: Key, value: unknown): string {
  return VALUE_TYPES[key] === "json" ? JSON.stringify(value) : String(value);
}

export async function getSettings(): Promise<PlatformSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const merged: PlatformSettings = { ...SETTING_DEFAULTS };
  try {
    const rows = await db.platformSetting.findMany();
    for (const row of rows) {
      if (row.key in merged) {
        (merged as unknown as Record<string, unknown>)[row.key] = decode(row.key as Key, row.value);
      }
    }
  } catch {
    // Settings table not migrated yet (first boot) — defaults are correct.
  }

  cache = { at: Date.now(), value: merged };
  return merged;
}

export async function getSetting<K extends Key>(key: K): Promise<PlatformSettings[K]> {
  return (await getSettings())[key];
}

export async function updateSettings(
  patch: Partial<PlatformSettings>,
  updatedBy?: string,
): Promise<PlatformSettings> {
  const entries = Object.entries(patch).filter(([k]) => k in SETTING_DEFAULTS) as [Key, unknown][];

  await db.$transaction(
    entries.map(([key, value]) =>
      db.platformSetting.upsert({
        where: { key },
        create: {
          key,
          value: encodeSetting(key, value),
          valueType: VALUE_TYPES[key],
          group: GROUPS[key],
          updatedBy,
        },
        update: { value: encodeSetting(key, value), updatedBy },
      }),
    ),
  );

  cache = null;
  return getSettings();
}

export const invalidateSettingsCache = () => {
  cache = null;
};

/** Commission for a specific creator: per-creator override wins. */
export async function resolveCommissionBps(creatorId: string): Promise<number> {
  const [settings, creator] = await Promise.all([
    getSettings(),
    db.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { commissionBpsOverride: true },
    }),
  ]);
  const bps = creator?.commissionBpsOverride ?? settings.commissionBps;
  return Math.min(Math.max(bps, 0), 10_000);
}

export const SETTING_GROUPS = GROUPS;
export const SETTING_VALUE_TYPES = VALUE_TYPES;
