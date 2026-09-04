import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { anonymousKey } from "@/lib/crypto";
import { parseStringArray } from "@/lib/json";

/**
 * Full course page payload in one place, so the page component and the
 * metadata generator read the same shape without duplicating the query.
 */
export async function getCourseBySlug(slug: string) {
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, subtitle: true, description: true,
      thumbnailUrl: true, previewVideoUrl: true, language: true, level: true,
      status: true, priceMinor: true, discountPriceMinor: true, currency: true,
      learningOutcomes: true, requirements: true, targetAudience: true,
      durationSeconds: true, lessonCount: true, moduleCount: true,
      studentCount: true, ratingAvg: true, ratingCount: true,
      hasCertificate: true, metaTitle: true, metaDescription: true,
      publishedAt: true, updatedAt: true, createdAt: true,
      creator: {
        select: {
          id: true, slug: true, displayName: true, instructorBio: true,
          isVerified: true, expertise: true,
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  avatarUrl: true, headline: true, websiteUrl: true,
                  linkedinUrl: true, youtubeUrl: true, facebookUrl: true,
                },
              },
            },
          },
          courses: {
            where: { status: "PUBLISHED" },
            select: { studentCount: true, ratingAvg: true, ratingCount: true },
          },
        },
      },
      category: { select: { slug: true, nameKa: true, nameEn: true } },
      subcategory: { select: { slug: true, nameKa: true, nameEn: true } },
      faqs: { orderBy: { sortOrder: "asc" }, select: { id: true, question: true, answer: true } },
      modules: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, title: true, description: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, title: true, type: true,
              durationSeconds: true, isFreePreview: true,
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  const creatorStats = course.creator.courses.reduce(
    (acc, c) => ({
      students: acc.students + c.studentCount,
      ratingCount: acc.ratingCount + c.ratingCount,
      weighted: acc.weighted + c.ratingAvg * c.ratingCount,
    }),
    { students: 0, ratingCount: 0, weighted: 0 },
  );

  return {
    ...course,
    outcomes: parseStringArray(course.learningOutcomes),
    requirementList: parseStringArray(course.requirements),
    audienceList: parseStringArray(course.targetAudience),
    expertiseList: parseStringArray(course.creator.expertise),
    creatorStats: {
      courseCount: course.creator.courses.length,
      studentCount: creatorStats.students,
      ratingCount: creatorStats.ratingCount,
      ratingAvg:
        creatorStats.ratingCount > 0
          ? Math.round((creatorStats.weighted / creatorStats.ratingCount) * 10) / 10
          : 0,
    },
  };
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;

/**
 * A course page is public only when PUBLISHED. Its creator and admins may
 * preview it in any state, which is what makes the "submit → review → publish"
 * flow usable without leaking drafts.
 */
export function assertCourseVisible(
  course: CourseDetail,
  viewer: { id: string; role: string; creatorId: string | null } | null,
): void {
  if (course.status === "PUBLISHED") return;
  const isOwner = viewer?.creatorId === course.creator.id;
  const isAdmin = viewer?.role === "ADMIN";
  if (!isOwner && !isAdmin) notFound();
}

/**
 * Record a page view for creator analytics, deduplicated per visitor per day.
 * Visitor identity is a salted hash — no raw IP or user-agent is ever stored.
 */
export async function recordCourseView(input: {
  courseId: string;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
}): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const visitorKey = anonymousKey(input.userId ?? input.ip ?? "anon", input.userAgent, day);

    const seen = await db.courseView.findFirst({
      where: { courseId: input.courseId, visitorKey },
      select: { id: true },
    });
    if (seen) return;

    await db.$transaction([
      db.courseView.create({
        data: {
          courseId: input.courseId,
          userId: input.userId,
          visitorKey,
          referrer: input.referrer?.slice(0, 300) ?? null,
        },
      }),
      db.course.update({ where: { id: input.courseId }, data: { viewCount: { increment: 1 } } }),
    ]);
  } catch {
    // Analytics must never break a page render.
  }
}

export async function getCourseReviews(courseId: string, limit = 10) {
  return db.review.findMany({
    where: { courseId, status: "VISIBLE" },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true, rating: true, title: true, body: true, createdAt: true,
      creatorReply: true, creatorRepliedAt: true,
      user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
  });
}

export async function getRatingBreakdown(courseId: string) {
  const rows = await db.review.groupBy({
    by: ["rating"],
    where: { courseId, status: "VISIBLE" },
    _count: { _all: true },
  });
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const r of rows) {
    counts[r.rating] = r._count._all;
    total += r._count._all;
  }
  return { counts, total };
}
