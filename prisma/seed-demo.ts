/**
 * Demo content — an optional, REMOVABLE showcase catalogue.
 *
 * Populates the marketplace with the Georgian sample instructors, courses,
 * students, purchases and reviews so the site can be demonstrated before real
 * instructors arrive.
 *
 * Everything it creates is fabricated. The instructors are invented, the
 * reviews were never written by anyone, and the sales never happened. That is
 * fine for a pre-launch demo and dishonest once real users arrive, so:
 *
 *   • it refuses to run unless SEED_DEMO_DATA=true is set explicitly;
 *   • every account it creates uses an @example.ge address, which is how the
 *     remove pass finds them again;
 *   • `SEED_DEMO_DATA=remove` deletes all of it, leaving real data untouched.
 *
 * It never wipes the database — unlike the development seed — so it is safe to
 * run against a deployment that already has your admin and settings.
 *
 *   npm run db:seed:demo     # add
 *   npm run db:unseed:demo   # remove
 */
import "./load-env";

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/crypto";
import { slugify } from "../src/lib/slug";
import { splitSale } from "../src/lib/money";
import { COURSES, CREATORS, REVIEW_TEXTS, STUDENTS } from "./seed-data";

const db = new PrismaClient();

/** Every demo account lives on this domain. It is the removal key. */
const DEMO_DOMAIN = "@example.ge";

const DEMO_STUDENT_PASSWORD = process.env.DEMO_PASSWORD ?? "DemoStudent123!";
const DEMO_CREATOR_PASSWORD = process.env.DEMO_PASSWORD ?? "DemoCreator123!";
const COMMISSION_BPS = Number(process.env.DEFAULT_COMMISSION_BPS ?? 1000);
const CURRENCY = process.env.DEFAULT_CURRENCY ?? "GEL";

/** Deterministic, so re-running produces the same numbers. */
let rngState = 42;
const rand = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/**
 * A payment reference for a demo purchase.
 *
 * Derived from the buyer and the course rather than from `rand()`. The RNG is
 * seeded to a constant so a full run reproduces the same catalogue, which
 * means an incremental run replays the identical sequence — and regenerates
 * references that are already in the database, tripping the unique index on
 * Purchase.reference. Keying on the pair is both stable and unique, since a
 * buyer never purchases the same course twice.
 */
function purchaseReference(paidAt: Date, userId: string, courseId: string): string {
  let hash = 0x811c9dc5;
  const pair = `${userId}:${courseId}`;
  for (let i = 0; i < pair.length; i++) {
    hash ^= pair.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const date = paidAt.toISOString().slice(2, 10).replace(/-/g, "");
  return `DEMO-${date}-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

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
  strength: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=70&auto=format&fit=crop",
  homefit: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=70&auto=format&fit=crop",
  nutrition: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=70&auto=format&fit=crop",
  yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=70&auto=format&fit=crop",
  shortform: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=70&auto=format&fit=crop",
  monetise: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=70&auto=format&fit=crop",
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

// ── Remove ──────────────────────────────────────────────────────────────────

async function removeDemo() {
  const demoUsers = await db.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });

  if (demoUsers.length === 0) {
    console.log("  nothing to remove — no demo accounts found");
    return;
  }
  const demoUserIds = demoUsers.map((u) => u.id);

  const demoCourses = await db.course.findMany({
    where: { creator: { user: { email: { endsWith: DEMO_DOMAIN } } } },
    select: { id: true },
  });
  const demoCourseIds = demoCourses.map((c) => c.id);

  // A real person may have bought a demo course while it was on display.
  // Deleting it would destroy an actual payment record, so refuse and say so
  // rather than quietly erasing someone's purchase.
  const realPurchases = demoCourseIds.length
    ? await db.purchase.count({
        where: { courseId: { in: demoCourseIds }, userId: { notIn: demoUserIds } },
      })
    : 0;

  if (realPurchases > 0) {
    throw new Error(
      `${realPurchases} purchase(s) of demo courses were made by real accounts. ` +
        "Refusing to delete — that would destroy financial records. Unpublish those " +
        "courses in the admin instead.",
    );
  }

  // Purchase.course is onDelete: Restrict — deliberately, so a sold course can
  // never vanish from under its payment records. That means the demo purchases
  // must be removed first; deleting the accounts then cascades through
  // CreatorProfile → Course → modules, lessons, reviews and enrolments.
  await db.$transaction([
    db.purchase.deleteMany({
      where: {
        OR: [
          ...(demoCourseIds.length ? [{ courseId: { in: demoCourseIds } }] : []),
          { userId: { in: demoUserIds } },
        ],
      },
    }),
    db.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } }),
  ]);

  const [users, courses, reviews] = await Promise.all([
    db.user.count(),
    db.course.count(),
    db.review.count(),
  ]);
  console.log(`  removed ${demoUsers.length} demo accounts and everything they owned`);
  console.log(`  remaining: ${users} users · ${courses} courses · ${reviews} reviews`);
}

// ── Add ─────────────────────────────────────────────────────────────────────

/**
 * Add anything from seed-data that is not in the database yet.
 *
 * This used to bail out entirely the moment a single demo account existed,
 * which meant a later release could never ship new demo content to a running
 * deployment — the catalogue froze at whatever the first run created. It is
 * incremental instead: existing accounts and courses are left exactly as they
 * are (including their purchase history), and only genuinely new rows are
 * written. Nothing here ever updates an existing row, so a demo course an
 * admin has since edited or unpublished stays that way.
 */
async function addDemo() {
  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  if (categoryBySlug.size === 0) {
    throw new Error("No categories found. Run the production seed first.");
  }

  // ── Instructors ──────────────────────────────────────────────────────────
  const creatorHash = await hashPassword(DEMO_CREATOR_PASSWORD);
  const creatorIdByEmail = new Map<string, string>();
  let avatarIndex = 0;

  let creatorsAdded = 0;

  for (const c of CREATORS) {
    const existing = await db.user.findUnique({
      where: { email: c.email },
      select: { creatorProfile: { select: { id: true } } },
    });
    if (existing?.creatorProfile) {
      creatorIdByEmail.set(c.email, existing.creatorProfile.id);
      avatarIndex++;
      continue;
    }

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
    creatorsAdded++;
  }
  console.log(`  ✓ ${creatorsAdded} instructors added (${CREATORS.length - creatorsAdded} already present)`);

  // ── Students ─────────────────────────────────────────────────────────────
  const studentHash = await hashPassword(DEMO_STUDENT_PASSWORD);
  const studentIds: string[] = [];
  let studentsAdded = 0;

  for (const s of STUDENTS) {
    const existing = await db.user.findUnique({ where: { email: s.email }, select: { id: true } });
    if (existing) {
      // Still collect them: they are the buyers for any newly added course.
      studentIds.push(existing.id);
      avatarIndex++;
      continue;
    }

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
    studentsAdded++;
  }
  console.log(`  ✓ ${studentsAdded} students added (${STUDENTS.length - studentsAdded} already present)`);

  // ── Courses ──────────────────────────────────────────────────────────────
  const created: { id: string; creatorId: string; priceMinor: number; title: string }[] = [];

  for (const course of COURSES) {
    const slug = slugify(course.title);
    if (await db.course.findUnique({ where: { slug }, select: { id: true } })) continue;

    const creatorId = creatorIdByEmail.get(course.creatorEmail)!;
    const publishedAt = daysAgo(randInt(15, 240));
    const priceMinor = Math.round(course.price * 100);
    const discountMinor = course.discountPrice ? Math.round(course.discountPrice * 100) : null;

    const row = await db.course.create({
      data: {
        slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: THUMBS[course.thumbSeed] ?? null,
        creatorId,
        categoryId: categoryBySlug.get(course.categorySlug) ?? null,
        subcategoryId: course.subcategorySlug
          ? (categoryBySlug.get(course.subcategorySlug) ?? null)
          : null,
        language: "ka",
        level: course.level,
        status: "PUBLISHED",
        priceMinor,
        discountPriceMinor: discountMinor,
        pricingModel: course.pricingModel ?? "ONE_TIME",
        subscriptionPriceMinor:
          course.subscriptionPrice === undefined
            ? null
            : Math.round(course.subscriptionPrice * 100),
        currency: CURRENCY,
        learningOutcomes: JSON.stringify(course.learningOutcomes),
        requirements: JSON.stringify(course.requirements),
        targetAudience: JSON.stringify(course.targetAudience),
        isFeatured: course.isFeatured ?? false,
        featuredRank: course.isFeatured ? randInt(1, 20) : null,
        submittedAt: publishedAt,
        reviewedAt: publishedAt,
        publishedAt,
        createdAt: daysAgo(randInt(250, 400)),
        faqs: {
          create: course.faqs.map((f, i) => ({
            question: f.question,
            answer: f.answer,
            sortOrder: i,
          })),
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
          courseId: row.id,
          title: mod.title,
          description: mod.description ?? null,
          sortOrder: moduleOrder++,
        },
        select: { id: true },
      });

      for (const lesson of mod.lessons) {
        const duration = lesson.type === "VIDEO" ? (lesson.durationSeconds ?? 15) : 0;
        const createdLesson = await db.lesson.create({
          data: {
            courseId: row.id,
            moduleId: createdModule.id,
            title: lesson.title,
            description: lesson.description ?? null,
            type: lesson.type,
            sortOrder: lessonOrder++,
            isFreePreview: lesson.isFreePreview ?? false,
            isPublished: true,
            // No asset: demo video files are not shipped to a deployment. Video
            // lessons show their metadata; the player reports no source rather
            // than pretending to stream something.
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
      where: { id: row.id },
      data: { lessonCount, moduleCount: course.modules.length, durationSeconds: totalDuration },
    });

    created.push({
      id: row.id,
      creatorId,
      priceMinor: discountMinor ?? priceMinor,
      title: course.title,
    });
  }
  console.log(`  ✓ ${created.length} courses added (${COURSES.length - created.length} already present)`);

  // ── Enrolments, sales and reviews ────────────────────────────────────────
  let purchases = 0;
  let reviews = 0;
  const seen = new Set<string>();

  for (const course of created) {
    const buyers = [...studentIds].sort(() => rand() - 0.5).slice(0, randInt(3, 9));

    for (const userId of buyers) {
      const key = `${userId}:${course.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const paidAt = daysAgo(randInt(1, 120));
      const amountMinor = course.priceMinor;
      const split = splitSale(amountMinor, COMMISSION_BPS);

      const purchase = await db.purchase.create({
        data: {
          reference: purchaseReference(paidAt, userId, course.id),
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
      purchases++;

      const lessons = await db.lesson.findMany({
        where: { courseId: course.id, isPublished: true },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      });
      const roll = rand();
      const done =
        roll < 0.25 ? lessons.length : roll < 0.7 ? Math.floor(lessons.length * rand()) : 0;
      const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

      await db.enrollment.create({
        data: {
          userId,
          courseId: course.id,
          source: amountMinor === 0 ? "FREE" : "PURCHASE",
          purchaseId: purchase.id,
          progressPercent: percent,
          completedLessons: done,
          startedAt: paidAt,
          completedAt: percent === 100 ? daysAgo(randInt(1, 30)) : null,
          createdAt: paidAt,
        },
      });

      for (let i = 0; i < done; i++) {
        await db.lessonProgress.create({
          data: {
            userId,
            courseId: course.id,
            lessonId: lessons[i]!.id,
            isCompleted: true,
            completedAt: daysAgo(randInt(1, 100)),
            watchedSeconds: randInt(60, 900),
          },
        });
      }

      if (split.creatorEarningsMinor > 0) {
        await db.balanceEntry.createMany({
          data: [
            {
              creatorId: course.creatorId,
              purchaseId: purchase.id,
              type: "SALE",
              amountMinor,
              currency: CURRENCY,
              description: `გაყიდვა: ${course.title}`,
              createdAt: paidAt,
            },
            {
              creatorId: course.creatorId,
              purchaseId: purchase.id,
              type: "PLATFORM_FEE",
              amountMinor: -split.platformFeeMinor,
              currency: CURRENCY,
              description: "პლატფორმის საკომისიო",
              createdAt: paidAt,
            },
          ],
        });
        await db.creatorBalance.update({
          where: { creatorId: course.creatorId },
          data: {
            grossSalesMinor: { increment: amountMinor },
            platformFeeMinor: { increment: split.platformFeeMinor },
            availableMinor: { increment: split.creatorEarningsMinor },
          },
        });
      }

      await db.course.update({
        where: { id: course.id },
        data: { studentCount: { increment: 1 }, viewCount: { increment: randInt(4, 40) } },
      });

      if (percent > 20 && rand() < 0.55) {
        const text = pick(REVIEW_TEXTS);
        await db.review.create({
          data: {
            userId,
            courseId: course.id,
            rating: text.rating,
            title: text.title,
            body: text.body,
            createdAt: daysAgo(randInt(1, 90)),
          },
        });
        reviews++;
      }
    }

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

  console.log(`  ✓ ${purchases} enrolments, ${reviews} reviews`);
}

// ── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const mode = (process.env.SEED_DEMO_DATA ?? "").toLowerCase();

  if (mode === "remove") {
    console.log("🧹 removing demo content");
    await removeDemo();
    return;
  }

  if (mode !== "true" && mode !== "1") {
    console.log(
      "demo seed skipped — set SEED_DEMO_DATA=true to add it, or SEED_DEMO_DATA=remove to delete it",
    );
    return;
  }

  console.log("🎭 adding demo content (fabricated instructors, courses and reviews)");
  await addDemo();

  const [users, courses] = await Promise.all([db.user.count(), db.course.count()]);
  console.log(`\n✅ done — ${users} users · ${courses} courses`);
  console.log("   Remove it later with SEED_DEMO_DATA=remove\n");
}

main()
  .catch((error) => {
    console.error("❌ demo seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
