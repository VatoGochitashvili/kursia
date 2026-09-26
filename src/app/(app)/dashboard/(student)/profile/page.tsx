import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { fill } from "@/i18n/config";
import { requireUser } from "@/lib/auth/rbac";
import { formatDate, formatNumber } from "@/lib/format";
import { listMyCircles } from "@/lib/my-circles";
import { levelFor } from "@/lib/points";
import { Alert, Avatar, Badge, Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { imageAt } from "@/lib/images";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * A member's own page: who they are, the circles they belong to, and where
 * they stand in each. Changing any of it happens in settings — this page only
 * shows the result, the way other members see them.
 */
export default async function ProfilePage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();
  const p = (path: string) => localePath(path, locale);

  const [record, circles, followers, following, points] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        emailVerified: true,
        createdAt: true,
        profile: {
          select: { fullName: true, avatarUrl: true, headline: true, bio: true, city: true },
        },
      },
    }),
    listMyCircles(user.id, locale),
    db.follow.count({ where: { followedUserId: user.id } }),
    db.follow.count({ where: { followerId: user.id, followedUserId: { not: null } } }),
    db.pointEvent.groupBy({
      by: ["creatorId"],
      where: { userId: user.id },
      _sum: { points: true },
    }),
  ]);

  const name = record?.profile?.fullName ?? user.fullName;
  const pointsByCircle = new Map(points.map((row) => [row.creatorId, row._sum.points ?? 0]));

  return (
    <div className="grid gap-5">
      {record && !record.emailVerified && (
        <Alert tone="warn" title={t.auth.verifyEmailTitle}>
          {t.auth.verifyEmailBody} — {record.email}
        </Alert>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar src={record?.profile?.avatarUrl} name={name} size={88} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[1.45rem] font-bold tracking-tight">{name}</h1>
                {record?.profile?.headline && (
                  <p className="mt-0.5 text-[14px] text-ink-muted">{record.profile.headline}</p>
                )}
              </div>
              <ButtonLink href={p("/dashboard/settings")} variant="outline" size="sm">
                <Icon name="settings" size={15} />
                {t.nav.settings}
              </ButtonLink>
            </div>
            {record?.profile?.bio && (
              <p className="mt-3 max-w-prose whitespace-pre-line text-[14px] leading-relaxed">
                {record.profile.bio}
              </p>
            )}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              <span>
                <span className="font-semibold tabular-nums text-ink">{followers}</span>{" "}
                {t.circle.followers}
              </span>
              <span>
                <span className="font-semibold tabular-nums text-ink">{following}</span>{" "}
                {t.circle.followingCount}
              </span>
              {record?.profile?.city && <span>{record.profile.city}</span>}
              {record && (
                <span>{fill(t.circle.memberSince, { date: formatDate(record.createdAt, locale) })}</span>
              )}
            </p>
          </div>
        </div>
      </Card>

      {[
        { key: "run", label: t.circle.youRun, rows: circles.filter((c) => c.role !== "MEMBER") },
        { key: "in", label: t.circle.youAreIn, rows: circles.filter((c) => c.role === "MEMBER") },
      ]
        .filter((group) => group.rows.length > 0)
        .map((group) => (
          <Card key={group.key} className="p-5">
            {/* The circles someone runs are a different kind of thing from the
                ones they joined — an owner opening this page is looking for
                work waiting on them, not for a room to read. */}
            <h2 className="text-[15px] font-bold">
              {circles.some((c) => c.role !== "MEMBER") ? group.label : t.circle.membershipsTitle}
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.rows.map((circle) => {
                const total = pointsByCircle.get(circle.creatorId) ?? 0;
                return (
                  <li key={circle.creatorId}>
                    <Link
                      href={p(`/community/${circle.slug}`)}
                      className="flex items-center gap-3 rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-sunken/60"
                    >
                      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                        {circle.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
                          <img src={imageAt(circle.coverUrl, 200) ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-semibold">{circle.name}</span>
                          {circle.role === "OWNER" && <Badge tone="brand">{t.circle.owner}</Badge>}
                          {circle.role === "ADMIN" && <Badge tone="success">{t.circle.admin}</Badge>}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-ink-subtle">
                          {circle.pendingRequests > 0
                            ? `${circle.pendingRequests} ${t.circle.waiting}`
                            : `${fill(t.circle.level, { n: String(levelFor(total).level) })} · ${formatNumber(total)} ${t.circle.points}`}
                        </span>
                      </span>
                      {circle.pendingRequests > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                          {circle.pendingRequests}
                        </span>
                      ) : (
                        <Icon name="arrowRight" size={14} className="shrink-0 text-ink-subtle" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}

      {circles.length === 0 && (
        <Card className="p-5">
          <h2 className="text-[15px] font-bold">{t.circle.membershipsTitle}</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{t.communities.noneYetBody}</p>
          <Link
            href={p("/")}
            className="mt-3 inline-flex text-[13px] font-semibold text-brand-600 hover:underline"
          >
            {t.communities.browse}
          </Link>
        </Card>
      )}
    </div>
  );
}
