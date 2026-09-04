import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ReviewReplyForm } from "@/components/creator/ReviewReplyForm";
import { Avatar, Card, EmptyState, Stars } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatorReviewsPage() {
  const { locale, t } = await getI18n();
  const creator = await requireCreator();

  const [reviews, aggregate] = await Promise.all([
    db.review.findMany({
      where: { course: { creatorId: creator.creatorId }, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, rating: true, title: true, body: true, createdAt: true,
        creatorReply: true, creatorRepliedAt: true,
        course: { select: { title: true, slug: true } },
        user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
      },
    }),
    db.review.aggregate({
      where: { course: { creatorId: creator.creatorId }, status: "VISIBLE" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const average = Math.round((aggregate._avg.rating ?? 0) * 10) / 10;

  return (
    <>
      <PageHeader
        title={t.creator.reviews}
        subtitle={`${aggregate._count._all} ${t.common.reviews.toLowerCase()}`}
        action={
          aggregate._count._all > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-ink">
                {average.toFixed(1)}
              </span>
              <Stars rating={average} size={16} />
            </div>
          ) : undefined
        }
      />

      {reviews.length === 0 ? (
        <EmptyState icon={<Icon name="star" size={30} />} title={t.reviews.noReviews} />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={review.user.profile?.avatarUrl}
                    name={review.user.profile?.fullName ?? "?"}
                    size={38}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="text-[13px] font-semibold text-ink">
                        {review.user.profile?.fullName ?? "—"}
                      </span>
                      <Stars rating={review.rating} size={13} />
                      <span className="text-[11px] text-ink-subtle">
                        {formatDate(review.createdAt, locale)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-brand-600">{review.course.title}</p>

                    {review.title && (
                      <p className="mt-2 text-[14px] font-semibold text-ink">{review.title}</p>
                    )}
                    {review.body && (
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                        {review.body}
                      </p>
                    )}

                    <div className="mt-3">
                      <ReviewReplyForm
                        reviewId={review.id}
                        existingReply={review.creatorReply}
                        labels={{
                          reply: t.learn.reply,
                          placeholder:
                            locale === "en"
                              ? "Thank the student, or clarify a point…"
                              : "მადლობა გადაუხადეთ სტუდენტს ან დააზუსტეთ დეტალი…",
                          save: t.common.save,
                          cancel: t.common.cancel,
                          edit: t.common.edit,
                          yourReply: t.reviews.instructorReply,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
