import { db } from "@/lib/db";

/**
 * Platform-wide analytics for the admin dashboard.
 *
 * Platform earnings are read from `Purchase.platformFeeMinor` — the fee that
 * was actually applied at sale time — not recomputed from today's commission
 * setting. Changing the commission must never rewrite history.
 */
export async function getPlatformOverview(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    users,
    students,
    creators,
    verifiedCreators,
    courses,
    published,
    pending,
    salesAll,
    salesMonth,
    refunds,
    pendingPayouts,
    paidPayouts,
    recentPurchases,
    seriesRows,
    topCourses,
  ] = await Promise.all([
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.user.count({ where: { role: "CREATOR", status: "ACTIVE" } }),
    db.creatorProfile.count({ where: { isVerified: true } }),
    db.course.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.course.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.purchase.aggregate({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      _sum: { amountMinor: true, platformFeeMinor: true, creatorEarningsMinor: true },
      _count: { _all: true },
    }),
    db.purchase.aggregate({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: monthStart } },
      _sum: { amountMinor: true, platformFeeMinor: true },
      _count: { _all: true },
    }),
    db.refund.aggregate({
      where: { status: "PROCESSED" },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    db.payout.aggregate({
      where: { status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    db.payout.aggregate({
      where: { status: "PAID" },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    db.purchase.findMany({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: {
        id: true, reference: true, amountMinor: true, platformFeeMinor: true,
        currency: true, paidAt: true,
        course: { select: { title: true, slug: true } },
        user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
      },
    }),
    db.purchase.findMany({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: since } },
      select: { paidAt: true, amountMinor: true, platformFeeMinor: true },
    }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { studentCount: "desc" },
      take: 8,
      select: {
        id: true, slug: true, title: true, studentCount: true,
        ratingAvg: true, ratingCount: true, currency: true,
        creator: { select: { displayName: true } },
      },
    }),
  ]);

  // Zero-filled daily series so a quiet day renders as 0, not a gap.
  const series = new Map<string, { date: string; revenueMinor: number; sales: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    series.set(key, { date: key, revenueMinor: 0, sales: 0 });
  }
  for (const row of seriesRows) {
    if (!row.paidAt) continue;
    const point = series.get(row.paidAt.toISOString().slice(0, 10));
    if (point) {
      // The admin chart plots what the PLATFORM earns.
      point.revenueMinor += row.platformFeeMinor;
      point.sales += 1;
    }
  }

  return {
    users,
    students,
    creators,
    verifiedCreators,
    courses,
    publishedCourses: published,
    pendingCourses: pending,
    grossVolumeMinor: salesAll._sum.amountMinor ?? 0,
    platformEarningsMinor: salesAll._sum.platformFeeMinor ?? 0,
    creatorEarningsMinor: salesAll._sum.creatorEarningsMinor ?? 0,
    totalSales: salesAll._count._all,
    monthVolumeMinor: salesMonth._sum.amountMinor ?? 0,
    monthPlatformMinor: salesMonth._sum.platformFeeMinor ?? 0,
    monthSales: salesMonth._count._all,
    refundedMinor: refunds._sum.amountMinor ?? 0,
    refundCount: refunds._count._all,
    pendingPayoutMinor: pendingPayouts._sum.amountMinor ?? 0,
    pendingPayoutCount: pendingPayouts._count._all,
    paidPayoutMinor: paidPayouts._sum.amountMinor ?? 0,
    recentPurchases,
    series: [...series.values()],
    topCourses,
  };
}

export type PlatformOverview = Awaited<ReturnType<typeof getPlatformOverview>>;
