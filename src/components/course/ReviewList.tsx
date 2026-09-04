import { Avatar, Stars } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/enums";
import type { Dictionary } from "@/i18n";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: Date;
  creatorReply: string | null;
  creatorRepliedAt: Date | null;
  user: { id: string; profile: { fullName: string; avatarUrl: string | null } | null };
}

export function RatingSummary({
  average,
  total,
  breakdown,
  locale,
  t,
}: {
  average: number;
  total: number;
  breakdown: Record<number, number>;
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="shrink-0 text-center sm:text-left">
        <p className="text-5xl font-bold tabular-nums tracking-tight text-ink">
          {average > 0 ? average.toFixed(1) : "—"}
        </p>
        <Stars rating={average} size={17} className="mt-2 justify-center sm:justify-start" />
        <p className="mt-1.5 text-[13px] text-ink-muted">
          {t.reviews.basedOn.replace("{count}", String(total))}
        </p>
      </div>

      <ul className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-2.5 text-[12px]">
              <span className="w-8 shrink-0 tabular-nums text-ink-muted">{star} ★</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-warn-500" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-9 shrink-0 text-right tabular-nums text-ink-subtle">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReviewList({
  reviews,
  locale,
  t,
}: {
  reviews: ReviewItem[];
  locale: Locale;
  t: Dictionary;
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-ink-muted">{t.reviews.noReviews}</p>;
  }

  return (
    <ul className="space-y-5">
      {reviews.map((review) => (
        <li key={review.id} className="border-b border-line pb-5 last:border-0 last:pb-0">
          <div className="flex items-start gap-3">
            <Avatar
              src={review.user.profile?.avatarUrl}
              name={review.user.profile?.fullName ?? "?"}
              size={38}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-sm font-semibold text-ink">
                  {review.user.profile?.fullName ?? "—"}
                </span>
                <Stars rating={review.rating} size={13} />
                <span className="text-[12px] text-ink-subtle">
                  {formatDate(review.createdAt, locale)}
                </span>
              </div>

              {review.title && (
                <p className="mt-1.5 text-[15px] font-semibold text-ink">{review.title}</p>
              )}
              {review.body && (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                  {review.body}
                </p>
              )}

              {review.creatorReply && (
                <div className="mt-3 rounded-xl border-l-3 border-brand-300 bg-brand-50/60 px-3.5 py-2.5">
                  <p className="text-[12px] font-semibold text-brand-700">
                    {t.reviews.instructorReply}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                    {review.creatorReply}
                  </p>
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
