import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/settings";
import { communityLabel } from "@/lib/membership";
import { getPlanState } from "@/lib/creator-plan";
import { PageHeader } from "@/components/layout/DashboardShell";
import { CommunityRow, type AdminCommunity } from "@/components/admin/CommunityRow";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Circles", robots: { index: false } };
export const dynamic = "force-dynamic";

const FILTERS = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED", "ALL"] as const;

interface Props {
  searchParams: Promise<{ status?: string }>;
}

/**
 * Every circle on the platform, and the decision about each.
 *
 * Defaults to PENDING because that is the only tab with work in it — an admin
 * opening this page wants the queue, not an archive.
 */
export default async function AdminCommunitiesPage({ searchParams }: Props) {
  const [{ locale, t }, params, settings] = await Promise.all([
    getI18n(),
    searchParams,
    getSettings(),
  ]);
  await requireAdmin();
  const p = (path: string) => localePath(path, locale);

  const status = (FILTERS as readonly string[]).includes(params.status ?? "")
    ? (params.status as (typeof FILTERS)[number])
    : "PENDING";

  const rows = await db.creatorProfile.findMany({
    where: status === "ALL" ? {} : { communityStatus: status },
    orderBy: [{ communitySubmittedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true, slug: true, displayName: true,
      communityName: true, communityTagline: true, communityStatus: true,
      communityReviewNote: true, communityEnabled: true,
      communityPriceMinor: true, communityCurrency: true,
      communityMemberCount: true, communitySubmittedAt: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  });

  // One plan lookup per row. The queue is capped at 100 and this page is only
  // ever opened by an admin, so a join is not worth the complexity here.
  const communities: AdminCommunity[] = await Promise.all(
    rows.map(async (row) => ({
      creatorId: row.id,
      slug: row.slug,
      displayName: row.displayName,
      avatarUrl: row.user.profile?.avatarUrl ?? null,
      name: communityLabel(
        { communityName: row.communityName, displayName: row.displayName },
        locale,
      ),
      tagline: row.communityTagline,
      status: row.communityStatus,
      reviewNote: row.communityReviewNote,
      enabled: row.communityEnabled,
      priceMinor: row.communityPriceMinor,
      currency: row.communityCurrency,
      memberCount: row.communityMemberCount,
      planActive: (await getPlanState(row.id, settings.creatorPlanPriceMinor)).active,
      submittedAt: row.communitySubmittedAt?.toISOString() ?? null,
    })),
  );

  const counts = await db.creatorProfile.groupBy({
    by: ["communityStatus"],
    _count: { _all: true },
  });
  const countByStatus = new Map(counts.map((c) => [c.communityStatus, c._count._all]));

  return (
    <>
      <PageHeader title={t.admin.communities} subtitle={t.admin.communitiesSubtitle} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((key) => (
          <Link
            key={key}
            href={p(`/admin/communities?status=${key}`)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors",
              status === key ? "bg-ink text-white" : "bg-surface-sunken text-ink-muted hover:text-ink",
            )}
          >
            {key}
            {key !== "ALL" && (
              <span className="text-[11px] tabular-nums opacity-70">
                {countByStatus.get(key) ?? 0}
              </span>
            )}
          </Link>
        ))}
      </div>

      {communities.length === 0 ? (
        <Card className="p-10 text-center text-[14px] text-ink-muted">{t.common.empty}</Card>
      ) : (
        <ul className="grid gap-3">
          {communities.map((community) => (
            <li key={community.creatorId}>
              <CommunityRow community={community} t={t} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
