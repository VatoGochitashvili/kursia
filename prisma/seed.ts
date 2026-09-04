/**
 * Development seed.
 *
 * Produces a marketplace that behaves like a live one: real users with hashed
 * passwords, published courses with curricula, genuine purchases that flow
 * through the same fulfilment path as production (so creator balances and the
 * ledger are internally consistent), reviews, progress and certificates.
 *
 *   npm run db:reset     # wipe + push schema + seed
 *   npm run db:seed      # seed only (idempotent-ish: clears app tables first)
 */
import "./load-env";

import path from "node:path";
import { existsSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

import { hashPassword } from "../src/lib/crypto";
import { slugify } from "../src/lib/slug";
import { splitSale } from "../src/lib/money";
import {
  SETTING_DEFAULTS,
  SETTING_GROUPS,
  SETTING_VALUE_TYPES,
  encodeSetting,
} from "../src/lib/settings";
import { issueCertificate } from "../src/lib/certificates";
import { CATEGORIES, COURSES, CREATORS, REVIEW_TEXTS, STUDENTS } from "./seed-data";

const db = new PrismaClient();

const STUDENT_PASSWORD = "Student123!";
const CREATOR_PASSWORD = "Creator123!";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@kursia.ge";
const COMMISSION_BPS = Number(process.env.DEFAULT_COMMISSION_BPS ?? 1000);
const CURRENCY = process.env.DEFAULT_CURRENCY ?? "GEL";

/** Deterministic pseudo-randomness so reseeding produces stable numbers. */
let rngState = 42;
function rand(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/** Unsplash source images keyed by topic — deterministic and license-free. */
const THUMBS: Record<string, string> = {
  marketing: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=70&auto=format&fit=crop",
  python: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=70&auto=format&fit=crop",
  business: "https://images.unsplash.com/photo-1507099985932-87a4520ed1d5?w=800&q=70&auto=format&fit=crop",
  ai: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=70&auto=format&fit=crop",
  finance: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=70&auto=format&fit=crop",
  design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=70&auto=format&fit=crop",
  sales: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=70&auto=format&fit=crop",
  photo: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=70&auto=format&fit=crop",
  english: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=70&auto=format&fit=crop",
  productivity: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=70&auto=format&fit=crop",
};

const AVATARS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=70&auto=format&fit=crop",
];

const VIDEO_KEYS = [
  "lessons/video/seed/intro.mp4",
  "lessons/video/seed/lesson-a.mp4",
  "lessons/video/seed/lesson-b.mp4",
];
const CAPTIONS_KEY = "captions/seed/sample.vtt";

const storageRoot = process.env.STORAGE_LOCAL_ROOT ?? "./storage";
const hasSampleVideo = existsSync(path.resolve(process.cwd(), storageRoot, VIDEO_KEYS[0]!));

async function wipe() {
  // Order matters: children before parents. Deleting Users would cascade most
  // of this, but being explicit keeps the seed readable and safe to edit.
  const tables = [
    db.quizAttemptAnswer, db.quizAttempt, db.quizAnswer, db.quizQuestion, db.quiz,
    db.assignmentSubmission, db.assignment,
    db.lessonNote, db.lessonProgress, db.lessonResource, db.lesson, db.courseModule,
    db.commentLike, db.comment, db.review, db.wishlist, db.follow,
    db.certificate, db.enrollment,
    db.balanceEntry, db.payout, db.payoutMethod, db.creatorBalance,
    db.webhookEvent, db.refund, db.transaction, db.purchase,
    db.courseView, db.courseReviewEvent, db.courseFaq, db.course,
    db.notification, db.emailOutbox, db.auditLog, db.report,
    db.session, db.verificationToken, db.category,
    db.creatorProfile, db.profile, db.user, db.platformSetting,
  ];
  for (const table of tables) {
    await (table as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
}

async function seedSettings() {
  const rows: Prisma.PlatformSettingCreateManyInput[] = (
    Object.keys(SETTING_DEFAULTS) as (keyof typeof SETTING_DEFAULTS)[]
  ).map((key) => ({
    key,
    value: encodeSetting(key, SETTING_DEFAULTS[key]),
    valueType: SETTING_VALUE_TYPES[key],
    group: SETTING_GROUPS[key],
  }));
  await db.platformSetting.createMany({ data: rows });
}

async function seedCategories() {
  const bySlug = new Map<string, string>();
  let order = 0;
  for (const cat of CATEGORIES) {
    const parent = await db.category.create({
      data: {
        slug: cat.slug, nameKa: cat.nameKa, nameEn: cat.nameEn,
        descriptionKa: cat.descriptionKa, descriptionEn: cat.descriptionEn,
        icon: cat.icon, colorHex: cat.colorHex, sortOrder: order++,
      },
    });
    bySlug.set(cat.slug, parent.id);
    let childOrder = 0;
    for (const child of cat.children) {
      const created = await db.category.create({
        data: {
          slug: child.slug, nameKa: child.nameKa, nameEn: child.nameEn,
          parentId: parent.id, sortOrder: childOrder++,
        },
      });
      bySlug.set(child.slug, created.id);
    }
  }
  return bySlug;
}

async function main() {
  console.log("🌱 seeding…");
  await wipe();
  await seedSettings();
  console.log("  ✓ platform settings");

  const categoryIds = await seedCategories();
  console.log(`  ✓ ${categoryIds.size} categories`);

  // ── Admin ────────────────────────────────────────────────────────────────
  const adminHash = await hashPassword(ADMIN_PASSWORD);
  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: new Date(),
      profile: {
        create: {
          fullName: "პლატფორმის ადმინისტრატორი",
          username: "admin",
          headline: "პლატფორმის ადმინისტრირება",
          city: "თბილისი",
        },
      },
    },
  });
  console.log(`  ✓ admin (${ADMIN_EMAIL})`);

  // ── Creators ─────────────────────────────────────────────────────────────
  const creatorHash = await hashPassword(CREATOR_PASSWORD);
  const creatorIdByEmail = new Map<string, string>();
  let avatarIndex = 0;

  for (const c of CREATORS) {
    const user = await db.user.create({
      data: {
        email: c.email,
        passwordHash: creatorHash,
        role: "CREATOR",
        emailVerified: new Date(),
        createdAt: daysAgo(randInt(120, 400)),
        profile: {
          create: {
            fullName: c.fullName,
            username: c.username,
            headline: c.headline,
            bio: c.bio,
            city: c.city,
            avatarUrl: AVATARS[avatarIndex++ % AVATARS.length]!,
            websiteUrl: c.websiteUrl ?? null,
            linkedinUrl: c.linkedinUrl ?? null,
            youtubeUrl: c.youtubeUrl ?? null,
          },
        },
        creatorProfile: {
          create: {
            slug: slugify(c.displayName) || c.username,
            displayName: c.displayName,
            instructorBio: c.instructorBio,
            expertise: JSON.stringify(c.expertise),
            isVerified: c.isVerified,
            isFeatured: c.isFeatured,
            approvedAt: c.isVerified ? daysAgo(randInt(60, 300)) : null,
            balance: { create: { currency: CURRENCY } },
          },
        },
      },
      select: { creatorProfile: { select: { id: true } } },
    });
    creatorIdByEmail.set(c.email, user.creatorProfile!.id);
  }
  console.log(`  ✓ ${CREATORS.length} creators`);

  // ── Students ─────────────────────────────────────────────────────────────
  const studentHash = await hashPassword(STUDENT_PASSWORD);
  const studentIds: string[] = [];
  for (const s of STUDENTS) {
    const user = await db.user.create({
      data: {
        email: s.email,
        passwordHash: studentHash,
        role: "STUDENT",
        emailVerified: new Date(),
        createdAt: daysAgo(randInt(10, 200)),
        profile: {
          create: {
            fullName: s.fullName,
            username: s.username,
            city: s.city,
            avatarUrl: AVATARS[avatarIndex++ % AVATARS.length]!,
          },
        },
      },
      select: { id: true },
    });
    studentIds.push(user.id);
  }
  console.log(`  ✓ ${STUDENTS.length} students`);

  // ── Courses ──────────────────────────────────────────────────────────────
  const courseIds: { id: string; creatorId: string; priceMinor: number; title: string; slug: string }[] = [];
  let videoIndex = 0;

  for (const course of COURSES) {
    const creatorId = creatorIdByEmail.get(course.creatorEmail)!;
    const publishedAt = daysAgo(randInt(15, 240));
    const priceMinor = Math.round(course.price * 100);
    const discountMinor = course.discountPrice ? Math.round(course.discountPrice * 100) : null;

    const created = await db.course.create({
      data: {
        slug: slugify(course.title),
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: THUMBS[course.thumbSeed] ?? null,
        creatorId,
        categoryId: categoryIds.get(course.categorySlug) ?? null,
        subcategoryId: course.subcategorySlug ? (categoryIds.get(course.subcategorySlug) ?? null) : null,
        language: "ka",
        level: course.level,
        status: "PUBLISHED",
        priceMinor,
        discountPriceMinor: discountMinor,
        currency: CURRENCY,
        learningOutcomes: JSON.stringify(course.learningOutcomes),
        requirements: JSON.stringify(course.requirements),
        targetAudience: JSON.stringify(course.targetAudience),
        isFeatured: course.isFeatured ?? false,
        featuredRank: course.isFeatured ? randInt(1, 20) : null,
        hasCertificate: true,
        submittedAt: publishedAt,
        reviewedAt: publishedAt,
        publishedAt,
        createdAt: daysAgo(randInt(250, 400)),
        faqs: {
          create: course.faqs.map((f, i) => ({ question: f.question, answer: f.answer, sortOrder: i })),
        },
        reviewEvents: {
          create: [
            { fromStatus: "DRAFT", toStatus: "SUBMITTED", createdAt: publishedAt },
            { fromStatus: "SUBMITTED", toStatus: "APPROVED", note: "ყველა კრიტერიუმი დაკმაყოფილებულია", createdAt: publishedAt },
            { fromStatus: "APPROVED", toStatus: "PUBLISHED", createdAt: publishedAt },
          ],
        },
      },
      select: { id: true },
    });

    let moduleOrder = 0;
    let lessonOrder = 0;
    let totalDuration = 0;
    let lessonCount = 0;

    for (const mod of course.modules) {
      const createdModule = await db.courseModule.create({
        data: {
          courseId: created.id,
          title: mod.title,
          description: mod.description ?? null,
          sortOrder: moduleOrder++,
        },
        select: { id: true },
      });

      for (const lesson of mod.lessons) {
        const isVideo = lesson.type === "VIDEO";
        const assetKey = isVideo && hasSampleVideo ? VIDEO_KEYS[videoIndex++ % VIDEO_KEYS.length]! : null;
        const duration = isVideo ? (lesson.durationSeconds ?? 15) : 0;

        const createdLesson = await db.lesson.create({
          data: {
            courseId: created.id,
            moduleId: createdModule.id,
            title: lesson.title,
            description: lesson.description ?? null,
            type: lesson.type,
            sortOrder: lessonOrder++,
            isFreePreview: lesson.isFreePreview ?? false,
            isPublished: true,
            assetKey,
            assetMimeType: assetKey ? "video/mp4" : null,
            captionsKey: assetKey ? CAPTIONS_KEY : null,
            durationSeconds: duration,
            textContent: lesson.textContent ?? null,
          },
          select: { id: true },
        });

        totalDuration += duration;
        lessonCount++;

        if (lesson.quiz) {
          const quiz = await db.quiz.create({
            data: {
              lessonId: createdLesson.id,
              title: lesson.quiz.title,
              passingScore: lesson.quiz.passingScore,
              instructions: "აირჩიეთ სწორი პასუხები. შედეგს დაუყოვნებლივ ნახავთ.",
            },
            select: { id: true },
          });
          let qOrder = 0;
          for (const q of lesson.quiz.questions) {
            await db.quizQuestion.create({
              data: {
                quizId: quiz.id,
                prompt: q.prompt,
                type: q.type,
                explanation: q.explanation ?? null,
                points: 1,
                sortOrder: qOrder++,
                answers: {
                  create: q.answers.map((a, i) => ({
                    text: a.text,
                    isCorrect: a.isCorrect,
                    sortOrder: i,
                  })),
                },
              },
            });
          }
        }
      }
    }

    await db.course.update({
      where: { id: created.id },
      data: {
        lessonCount,
        moduleCount: course.modules.length,
        durationSeconds: totalDuration,
      },
    });

    courseIds.push({
      id: created.id,
      creatorId,
      priceMinor: discountMinor ?? priceMinor,
      title: course.title,
      slug: slugify(course.title),
    });
  }
  console.log(`  ✓ ${COURSES.length} published courses`);

  // ── Purchases, enrolments, ledger ────────────────────────────────────────
  // Built through the same arithmetic the runtime uses (splitSale), so creator
  // balances and the ledger agree with what the app would produce live.
  let purchaseCount = 0;
  let reviewCount = 0;
  const enrolled = new Set<string>();

  for (const course of courseIds) {
    const buyerCount = course.priceMinor === 0 ? randInt(6, 10) : randInt(3, 9);
    const buyers = [...studentIds].sort(() => rand() - 0.5).slice(0, buyerCount);

    for (const userId of buyers) {
      const key = `${userId}:${course.id}`;
      if (enrolled.has(key)) continue;
      enrolled.add(key);

      const paidAt = daysAgo(randInt(1, 120));
      const amountMinor = course.priceMinor;
      const split = splitSale(amountMinor, COMMISSION_BPS);
      const isFree = amountMinor === 0;

      const purchase = await db.purchase.create({
        data: {
          reference: `KRS-${paidAt.toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(rand() * 0xffffff).toString(16).toUpperCase().padStart(6, "0")}`,
          userId,
          courseId: course.id,
          creatorId: course.creatorId,
          currency: CURRENCY,
          listPriceMinor: amountMinor,
          amountMinor,
          commissionBps: COMMISSION_BPS,
          platformFeeMinor: split.platformFeeMinor,
          processingFeeMinor: 0,
          creatorEarningsMinor: split.creatorEarningsMinor,
          status: "PAID",
          paidAt,
          createdAt: paidAt,
        },
        select: { id: true },
      });
      purchaseCount++;

      if (!isFree) {
        await db.transaction.create({
          data: {
            purchaseId: purchase.id,
            userId,
            courseId: course.id,
            provider: "sandbox",
            providerOrderId: `sbx_seed_${purchase.id}`,
            status: "SUCCEEDED",
            amountMinor,
            currency: CURRENCY,
            createdAt: paidAt,
          },
        });
      }

      // Progress: some finished, some mid-course, some just started.
      const lessons = await db.lesson.findMany({
        where: { courseId: course.id, isPublished: true },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      });
      const roll = rand();
      const completedCount =
        roll < 0.25 ? lessons.length : roll < 0.7 ? Math.floor(lessons.length * rand()) : 0;
      const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

      await db.enrollment.create({
        data: {
          userId,
          courseId: course.id,
          source: isFree ? "FREE" : "PURCHASE",
          purchaseId: purchase.id,
          progressPercent: percent,
          completedLessons: completedCount,
          lastLessonId: lessons[Math.max(completedCount - 1, 0)]?.id ?? null,
          startedAt: paidAt,
          completedAt: percent === 100 ? daysAgo(randInt(1, 30)) : null,
          createdAt: paidAt,
        },
      });

      for (let i = 0; i < completedCount; i++) {
        await db.lessonProgress.create({
          data: {
            userId,
            courseId: course.id,
            lessonId: lessons[i]!.id,
            isCompleted: true,
            completedAt: daysAgo(randInt(1, 100)),
            lastPositionSeconds: 0,
            watchedSeconds: randInt(60, 900),
          },
        });
      }

      // Ledger entries mirroring recordSale().
      if (split.creatorEarningsMinor > 0) {
        const cleared = paidAt < daysAgo(14);
        await db.balanceEntry.createMany({
          data: [
            {
              creatorId: course.creatorId, purchaseId: purchase.id, type: "SALE",
              amountMinor, currency: CURRENCY, description: `გაყიდვა: ${course.title}`,
              availableAt: cleared ? null : new Date(paidAt.getTime() + 14 * 864e5),
              createdAt: paidAt,
            },
            {
              creatorId: course.creatorId, purchaseId: purchase.id, type: "PLATFORM_FEE",
              amountMinor: -split.platformFeeMinor, currency: CURRENCY,
              description: "პლატფორმის საკომისიო", createdAt: paidAt,
            },
          ],
        });
        await db.creatorBalance.update({
          where: { creatorId: course.creatorId },
          data: {
            grossSalesMinor: { increment: amountMinor },
            platformFeeMinor: { increment: split.platformFeeMinor },
            ...(cleared
              ? { availableMinor: { increment: split.creatorEarningsMinor } }
              : { pendingMinor: { increment: split.creatorEarningsMinor } }),
          },
        });
      }

      await db.course.update({
        where: { id: course.id },
        data: { studentCount: { increment: 1 }, viewCount: { increment: randInt(4, 40) } },
      });

      // Reviews from roughly half of students who made real progress.
      if (percent > 20 && rand() < 0.55) {
        const text = pick(REVIEW_TEXTS);
        await db.review.create({
          data: {
            userId, courseId: course.id,
            rating: text.rating, title: text.title, body: text.body,
            createdAt: daysAgo(randInt(1, 90)),
          },
        });
        reviewCount++;
      }

      // Certificates for completed courses.
      if (percent === 100) {
        await issueCertificate(userId, course.id).catch(() => undefined);
      }
    }

    // Refresh denormalised rating from the reviews just created.
    const agg = await db.review.aggregate({
      where: { courseId: course.id, status: "VISIBLE" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await db.course.update({
      where: { id: course.id },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
        ratingCount: agg._count._all,
      },
    });
  }
  console.log(`  ✓ ${purchaseCount} purchases, ${reviewCount} reviews`);

  // ── Wishlists + a course awaiting moderation ─────────────────────────────
  for (const userId of studentIds.slice(0, 8)) {
    const wanted = [...courseIds].sort(() => rand() - 0.5).slice(0, randInt(1, 3));
    for (const c of wanted) {
      if (enrolled.has(`${userId}:${c.id}`)) continue;
      await db.wishlist.create({ data: { userId, courseId: c.id } }).catch(() => undefined);
    }
  }

  // One pending course so the admin approval queue is not empty on first run.
  const pendingCreatorId = creatorIdByEmail.get("davit.gogoladze@example.ge")!;
  const pending = await db.course.create({
    data: {
      slug: "sabuღaltro-agritskva-damtsqebtatvis",
      title: "ბუღალტრული აღრიცხვა დამწყებთათვის",
      subtitle: "პირველადი დოკუმენტიდან ფინანსურ ანგარიშგებამდე",
      description:
        "კურსი განკუთვნილია მათთვის, ვისაც ბუღალტრული აღრიცხვის საფუძვლების ათვისება სურს. განვიხილავთ პირველად დოკუმენტაციას, გატარებებს, ანგარიშთა გეგმას და ფინანსური ანგარიშგების მომზადებას.",
      thumbnailUrl: THUMBS.finance!,
      creatorId: pendingCreatorId,
      categoryId: categoryIds.get("finansebi") ?? null,
      language: "ka",
      level: "BEGINNER",
      status: "SUBMITTED",
      priceMinor: 12900,
      currency: CURRENCY,
      learningOutcomes: JSON.stringify([
        "გაიგებ ორმაგი ჩაწერის პრინციპს",
        "მოამზადებ ფინანსურ ანგარიშგებას",
      ]),
      requirements: JSON.stringify(["წინასწარი ცოდნა არ არის საჭირო"]),
      targetAudience: JSON.stringify(["დამწყები ბუღალტრები", "მცირე ბიზნესის მფლობელები"]),
      submittedAt: daysAgo(2),
      reviewEvents: { create: [{ fromStatus: "DRAFT", toStatus: "SUBMITTED", createdAt: daysAgo(2) }] },
    },
    select: { id: true },
  });
  const pendingModule = await db.courseModule.create({
    data: { courseId: pending.id, title: "მოდული 1 — საფუძვლები", sortOrder: 0 },
    select: { id: true },
  });
  await db.lesson.createMany({
    data: [
      { courseId: pending.id, moduleId: pendingModule.id, title: "ორმაგი ჩაწერის პრინციპი", type: "TEXT", sortOrder: 0, textContent: "ყოველი ოპერაცია აისახება ორ ანგარიშზე — დებეტსა და კრედიტში. ჯამები ყოველთვის ემთხვევა." },
      { courseId: pending.id, moduleId: pendingModule.id, title: "ანგარიშთა გეგმა", type: "TEXT", sortOrder: 1, textContent: "ანგარიშთა გეგმა არის სია, რომელიც განსაზღვრავს სად აისახება თითოეული ოპერაცია." },
    ],
  });
  await db.course.update({
    where: { id: pending.id },
    data: { lessonCount: 2, moduleCount: 1 },
  });
  console.log("  ✓ 1 course awaiting moderation");

  // ── Summary ──────────────────────────────────────────────────────────────
  const [users, courses, enrollments, certificates] = await Promise.all([
    db.user.count(), db.course.count(), db.enrollment.count(), db.certificate.count(),
  ]);

  console.log(`
✅ Seed complete
   users ${users} · courses ${courses} · enrolments ${enrollments} · certificates ${certificates}

   Sign in with:
     admin     ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
     creator   ${CREATORS[0]!.email} / ${CREATOR_PASSWORD}
     student   ${STUDENTS[0]!.email} / ${STUDENT_PASSWORD}
${hasSampleVideo ? "" : "\n   ⚠ No sample video found — run: node scripts/make-sample-media.mjs\n"}`);
}

main()
  .catch((error) => {
    console.error("❌ seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
