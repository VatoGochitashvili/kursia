/**
 * Production seed — the minimum a live platform needs to function.
 *
 * Deliberately does NOT create the demo courses, fake creators, invented
 * reviews or sample purchases that `seed.ts` produces. Those exist to make
 * development look like a real marketplace; putting them in production would
 * mean shipping fabricated instructors and reviews to real users.
 *
 * What this DOES create:
 *   • platform settings (commission, branding, moderation rules)
 *   • the category tree
 *   • one administrator, from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 *
 * Safe to re-run: everything is upserted, and an existing admin is left alone.
 *
 *   npm run db:seed:prod
 */
import "./load-env";

import { PrismaClient, type Prisma } from "@prisma/client";

import { hashPassword } from "../src/lib/crypto";
import {
  SETTING_DEFAULTS,
  SETTING_GROUPS,
  SETTING_VALUE_TYPES,
  encodeSetting,
} from "../src/lib/settings";
import { CATEGORIES } from "./seed-data";

const db = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

/**
 * Settings and category ordering both ship with the code but can be edited by
 * an administrator. This seed runs on every container boot, so it needs to be
 * able to deliver a change — a new tagline, a reordered catalogue — to a
 * database that was seeded by an earlier release. Once a human has saved
 * anything through the admin UI, their choices outrank the file and the seed
 * goes back to creating only what is missing.
 */
async function adminHasEdited(actions: string[]) {
  const edits = await db.auditLog.count({ where: { action: { in: actions } } });
  return edits > 0;
}

// These literals mirror AUDIT_ACTIONS in src/lib/audit.ts. They are not
// imported because that module pulls in next/headers, which has no business
// inside a standalone seed bundle.
const SETTINGS_ACTIONS = ["settings.updated"];
const CATEGORY_ACTIONS = ["category.created", "category.updated", "category.deleted"];

/** Presentation copy an admin is unlikely to have hand-tuned before launch. */
const REFRESHABLE_SETTINGS = new Set<keyof typeof SETTING_DEFAULTS>([
  "taglineKa",
  "taglineEn",
  "seoDefaultTitleKa",
  "seoDefaultDescriptionKa",
  "homepageSections",
]);

async function seedSettings() {
  const curated = await adminHasEdited(SETTINGS_ACTIONS);
  const keys = Object.keys(SETTING_DEFAULTS) as (keyof typeof SETTING_DEFAULTS)[];

  for (const key of keys) {
    const row: Prisma.PlatformSettingCreateInput = {
      key,
      value: encodeSetting(key, SETTING_DEFAULTS[key]),
      valueType: SETTING_VALUE_TYPES[key],
      group: SETTING_GROUPS[key],
    };
    // Money, commission and payment settings are never touched after
    // creation — only copy the seed still owns, and only until an admin has
    // saved the settings form for the first time.
    const update =
      !curated && REFRESHABLE_SETTINGS.has(key) ? { value: row.value } : {};
    await db.platformSetting.upsert({ where: { key }, create: row, update });
  }

  return { count: keys.length, curated };
}

async function seedCategories() {
  const curated = await adminHasEdited(CATEGORY_ACTIONS);
  let created = 0;
  let order = 0;

  for (const cat of CATEGORIES) {
    const presentation = {
      nameKa: cat.nameKa,
      nameEn: cat.nameEn,
      icon: cat.icon,
      colorHex: cat.colorHex,
      descriptionKa: cat.descriptionKa,
      descriptionEn: cat.descriptionEn,
    };
    const parent = await db.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, ...presentation, sortOrder: order },
      update: curated ? presentation : { ...presentation, sortOrder: order },
      select: { id: true },
    });
    order++;
    created++;

    let childOrder = 0;
    for (const child of cat.children) {
      await db.category.upsert({
        where: { slug: child.slug },
        create: {
          slug: child.slug,
          nameKa: child.nameKa,
          nameEn: child.nameEn,
          parentId: parent.id,
          sortOrder: childOrder,
        },
        update: curated
          ? { nameKa: child.nameKa, nameEn: child.nameEn }
          : { nameKa: child.nameKa, nameEn: child.nameEn, parentId: parent.id, sortOrder: childOrder },
      });
      childOrder++;
      created++;
    }
  }

  return { count: created, curated };
}

async function seedAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return "skipped — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one";
  }
  // Warn rather than throw: this runs on the container's boot path, and a weak
  // password must not stop settings and categories — already seeded above —
  // from being reported, nor keep the site from starting.
  if (ADMIN_PASSWORD.length < 10) {
    return "skipped — SEED_ADMIN_PASSWORD must be at least 10 characters";
  }

  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    select: { id: true, role: true },
  });
  if (existing) {
    return `already exists (${ADMIN_EMAIL}) — password left unchanged`;
  }

  // Any admin at all means bootstrapping is done; do not silently add another.
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    return `skipped — ${adminCount} administrator(s) already exist`;
  }

  await db.user.create({
    data: {
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: "ADMIN",
      emailVerified: new Date(),
      profile: {
        create: {
          fullName: "Administrator",
          username: "admin",
        },
      },
    },
  });

  return `created (${ADMIN_EMAIL}) — change this password immediately`;
}

async function main() {
  console.log("🌱 production seed");

  const settings = await seedSettings();
  console.log(
    `  ✓ ${settings.count} platform settings ensured` +
      (settings.curated ? " (left as the administrator configured them)" : ""),
  );

  const categories = await seedCategories();
  console.log(
    `  ✓ ${categories.count} categories ensured` +
      (categories.curated ? " (ordering left to the administrator)" : ""),
  );

  const admin = await seedAdmin();
  console.log(`  ✓ admin: ${admin}`);

  const [users, courses] = await Promise.all([db.user.count(), db.course.count()]);
  console.log(`\n✅ done — users ${users} · courses ${courses}\n`);
}

main()
  .catch((error) => {
    console.error("❌ production seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
