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

async function seedSettings() {
  const keys = Object.keys(SETTING_DEFAULTS) as (keyof typeof SETTING_DEFAULTS)[];

  for (const key of keys) {
    const row: Prisma.PlatformSettingCreateInput = {
      key,
      value: encodeSetting(key, SETTING_DEFAULTS[key]),
      valueType: SETTING_VALUE_TYPES[key],
      group: SETTING_GROUPS[key],
    };
    // Never overwrite a value an administrator has already tuned.
    await db.platformSetting.upsert({ where: { key }, create: row, update: {} });
  }

  return keys.length;
}

async function seedCategories() {
  let created = 0;
  let order = 0;

  for (const cat of CATEGORIES) {
    const parent = await db.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        nameKa: cat.nameKa,
        nameEn: cat.nameEn,
        descriptionKa: cat.descriptionKa,
        descriptionEn: cat.descriptionEn,
        icon: cat.icon,
        colorHex: cat.colorHex,
        sortOrder: order,
      },
      // Only refresh presentation; leave sortOrder and isActive as configured.
      update: { nameKa: cat.nameKa, nameEn: cat.nameEn, icon: cat.icon, colorHex: cat.colorHex },
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
        update: { nameKa: child.nameKa, nameEn: child.nameEn },
      });
      childOrder++;
      created++;
    }
  }

  return created;
}

async function seedAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return "skipped — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one";
  }
  if (ADMIN_PASSWORD.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
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
  console.log(`  ✓ ${settings} platform settings ensured`);

  const categories = await seedCategories();
  console.log(`  ✓ ${categories} categories ensured`);

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
