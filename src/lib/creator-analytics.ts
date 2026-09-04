import { db } from "@/lib/db";

/**
 * Creator analytics.
 *
 * Every figure here is derived from the same rows the money flows through
 * (Purchase, BalanceEntry, CourseView), so a creator's dashboard and the
 * platform's books can never disagree.
 */

export interface DayPoint {
  date: string; // YYYY-MM-DD
  revenueMinor: number;
  sales: number;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Zero-filled daily series — a gap in sales must render as 0, not vanish. */
function emptySeries(days: number): Map<string, DayPoint> {
  const series = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000);
    const key = dayKey(date);
    series.set(key, { date: key, revenueMinor: 0, sales: 0 });
  }
  return series;
}

export async function getCreatorOverview(creatorId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    courses,
    paidAll,
    paidThisMonth,
    recentPurchases,
    recentReviews,
    students,
    views,
    ratingAgg,
    seriesRows,
  ] = await Promise.all([
    db.course.findMany({
      where: { creatorId },
      select: {
        id: true, slug: true, title: true, status: true, thumbnailUrl: true,
        studentCount: true, ratingAvg: true, ratingCount: true, viewCount: true,
        priceMinor: true, discountPriceMinor: true, currency: true,
        lessonCount: true, updatedAt: true, publishedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.purchase.aggregate({
      where: { creatorId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      _sum: { amountMinor: true, creatorEarningsMinor: true, platformFeeMinor: true },
      _count: { _all: true },
    }),
    db.purchase.aggregate({
      where: {
        creatorId,
        status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
        paidAt: { gte: monthStart },
      },
      _sum: { amountMinor: true, creatorEarningsMinor: true },
      _count: { _all: true },
    }),
    db.purchase.findMany({
      where: { creatorId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      orderBy: { paidAt: "desc" },
      take: 8,
      select: {
        id: true, reference: true, amountMinor: true, creatorEarningsMinor: true,
        currency: true, paidAt: true,
        course: { select: { title: true, slug: true } },
        user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
      },
    }),
    db.review.findMany({
      where: { course: { creatorId }, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, rating: true, title: true, body: true, createdAt: true, creatorReply: true,
        course: { select: { title: true, slug: true } },
        user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
      },
    }),
    db.enrollment.count({ where: { course: { creatorId }, revokedAt: null } }),
    db.courseView.count({ where: { course: { creatorId }, createdAt: { gte: since } } }),
    db.course.aggregate({
      where: { creatorId, ratingCount: { gt: 0 } },
      _avg: { ratingAvg: true },
      _sum: { ratingCount: true },
    }),
    db.purchase.findMany({
      where: {
        creatorId,
        status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
        paidAt: { gte: since },
      },
      select: { paidAt: true, amountMinor: true, creatorEarningsMinor: true },
    }),
  ]);

  const series = emptySeries(days);
  for (const row of seriesRows) {
    if (!row.paidAt) continue;
    const key = dayKey(row.paidAt);
    const point = series.get(key);
    if (point) {
      point.revenueMinor += row.creatorEarningsMinor;
      point.sales += 1;
    }
  }

  const totalSales = paidAll._count._all;
  // Conversion is meaningless without traffic — report null rather than 0%.
  const totalViews = courses.reduce((sum, c) => sum + c.viewCount, 0);
  const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : null;

  return {
    courses,
    publishedCount: courses.filter((c) => c.status === "PUBLISHED").length,
    pendingCount: courses.filter((c) =>
      ["SUBMITTED", "UNDER_REVIEW"].includes(c.status),
    ).length,
    draftCount: courses.filter((c) =>
      ["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(c.status),
    ).length,
    grossRevenueMinor: paidAll._sum.amountMinor ?? 0,
    earningsMinor: paidAll._sum.creatorEarningsMinor ?? 0,
    platformFeeMinor: paidAll._sum.platformFeeMinor ?? 0,
    monthRevenueMinor: paidThisMonth._sum.creatorEarningsMinor ?? 0,
    monthSales: paidThisMonth._count._all,
    totalSales,
    totalStudents: students,
    viewsInPeriod: views,
    totalViews,
    conversionRate,
    averageRating: Math.round((ratingAgg._avg.ratingAvg ?? 0) * 10) / 10,
    reviewCount: ratingAgg._sum.ratingCount ?? 0,
    recentPurchases,
    recentReviews,
    series: [...series.values()],
  };
}

export type CreatorOverview = Awaited<ReturnType<typeof getCreatorOverview>>;

/** Per-course engagement: views, sales, completion rate. */
export async function getCourseAnalytics(creatorId: string) {
  const courses = await db.course.findMany({
    where: { creatorId },
    select: {
      id: true, slug: true, title: true, status: true, viewCount: true,
      studentCount: true, ratingAvg: true, ratingCount: true, lessonCount: true,
      currency: true,
      enrollments: { where: { revokedAt: null }, select: { progressPercent: true } },
      purchases: {
        where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        select: { amountMinor: true, creatorEarningsMinor: true },
      },
      _count: { select: { views: true } },
    },
    orderBy: { studentCount: "desc" },
  });

  return courses.map((course) => {
    const enrolled = course.enrollments.length;
    const completed = course.enrollments.filter((e) => e.progressPercent >= 100).length;
    const revenueMinor = course.purchases.reduce((s, p) => s + p.creatorEarningsMinor, 0);
    const grossMinor = course.purchases.reduce((s, p) => s + p.amountMinor, 0);

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: course.status,
      currency: course.currency,
      views: course.viewCount,
      uniqueVisitors: course._count.views,
      sales: course.purchases.length,
      students: enrolled,
      revenueMinor,
      grossMinor,
      // Conversion of *unique* visitors is the honest denominator.
      conversionRate: course._count.views > 0 ? (course.purchases.length / course._count.views) * 100 : null,
      completionRate: enrolled > 0 ? (completed / enrolled) * 100 : null,
      averageProgress:
        enrolled > 0
          ? Math.round(course.enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrolled)
          : 0,
      ratingAvg: course.ratingAvg,
      ratingCount: course.ratingCount,
    };
  });
}

/** Lesson-level engagement for one course. */
export async function getLessonEngagement(courseId: string) {
  const [lessons, enrolled] = await Promise.all([
    db.lesson.findMany({
      where: { courseId, isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, title: true, type: true, sortOrder: true, durationSeconds: true,
        _count: { select: { progress: { where: { isCompleted: true } } } },
      },
    }),
    db.enrollment.count({ where: { courseId, revokedAt: null } }),
  ]);

  return lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    durationSeconds: lesson.durationSeconds,
    completions: lesson._count.progress,
    completionRate: enrolled > 0 ? (lesson._count.progress / enrolled) * 100 : 0,
  }));
}
