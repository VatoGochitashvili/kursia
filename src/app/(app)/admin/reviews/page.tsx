import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ModerationButtons } from "@/components/admin/ModerationButtons";
import { Avatar, Badge, Card, EmptyState, Stars } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { locale, t } = await getI18n();
  const { status } = await searchParams;

  const reviews = await db.review.findMany({
    where: status && ["VISIBLE", "HIDDEN", "REMOVED"].includes(status) ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, rating: true, title: true, body: true, status: true, createdAt: true,
      course: { select: { title: true, slug: true } },
      user: { select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
  });

  const p = (path: string) => localePath(path, locale);
  const filters = ["", "VISIBLE", "HIDDEN", "REMOVED"];

  return (
    <>
      <PageHeader title={t.admin.reviews} subtitle={`${reviews.length}`} />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {filters.map((value) => (
          <Link
            key={value}
            href={value ? `?status=${value}` : "?"}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
              (status ?? "") === value
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-line-strong text-ink-muted hover:bg-surface-muted",
            )}
          >
            {value || t.common.all}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={<Icon name="star" size={30} />} title={t.reviews.noReviews} />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card className={cn("p-4", review.status !== "VISIBLE" && "opacity-70")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar
                      src={review.user.profile?.avatarUrl}
                      name={review.user.profile?.fullName ?? "?"}
                      size={34}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink">
                          {review.user.profile?.fullName ?? review.user.email}
                        </span>
                        <Stars rating={review.rating} size={12} />
                        <span className="text-[11px] text-ink-subtle">
                          {formatDate(review.createdAt, locale)}
                        </span>
                        {review.status !== "VISIBLE" && (
                          <Badge tone={review.status === "REMOVED" ? "danger" : "warn"}>
                            {review.status}
                          </Badge>
                        )}
                      </div>

                      <Link
                        href={p(`/courses/${review.course.slug}`)}
                        className="mt-0.5 block text-[12px] text-brand-600 hover:underline"
                      >
                        {review.course.title}
                      </Link>

                      {review.title && (
                        <p className="mt-1.5 text-[13px] font-semibold text-ink">{review.title}</p>
                      )}
                      {review.body && (
                        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
                          {review.body}
                        </p>
                      )}
                    </div>
                  </div>

                  <ModerationButtons
                    targetType="REVIEW"
                    targetId={review.id}
                    status={review.status}
                    labels={{
                      hide: locale === "en" ? "Hide" : "დამალვა",
                      restore: locale === "en" ? "Restore" : "აღდგენა",
                      remove: t.common.delete,
                    }}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
