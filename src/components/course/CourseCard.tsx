import Image from "next/image";
import Link from "next/link";
import type { CourseCard as CourseCardData } from "@/lib/courses";
import { discountPercent, effectivePriceMinor, formatMoney } from "@/lib/money";
import { formatCount, formatDuration, formatRating } from "@/lib/format";
import { Badge, Stars } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

interface Props {
  course: CourseCardData;
  locale: Locale;
  t: Dictionary;
  /** Fixed width inside a horizontal rail; fluid inside a grid. */
  variant?: "grid" | "rail";
  priority?: boolean;
  className?: string;
}

export function CourseCard({ course, locale, t, variant = "grid", priority, className }: Props) {
  const price = effectivePriceMinor(course.priceMinor, course.discountPriceMinor);
  const discount = discountPercent(course.priceMinor, course.discountPriceMinor);
  const href = localePath(`/courses/${course.slug}`, locale);
  const levelLabel = t.courses[`level${course.level}` as keyof typeof t.courses] as string;

  return (
    <article
      className={cn(
        // Motion is the whole difference between a card that feels inert and
        // one that feels responsive: a longer curve, a real lift, and a ring
        // that picks up the brand colour.
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface",
        "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-xl",
        variant === "rail" && "w-[17rem] shrink-0",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-subtle">
            <Icon name="book" size={32} />
          </div>
        )}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {course.isFeatured && <Badge tone="dark">{t.common.featured}</Badge>}
          {discount !== null && <Badge tone="accent">−{discount}%</Badge>}
          {price === 0 && <Badge tone="success">{t.common.free}</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {course.category && (
          <p className="mb-1.5 text-[11px] font-semibold text-brand-600">
            {locale === "en" ? course.category.nameEn : course.category.nameKa}
          </p>
        )}

        <h3 className="text-[15px] font-bold leading-snug text-ink">
          {/* Stretched link keeps the whole card clickable without nesting
              interactive elements inside an anchor. */}
          <Link
            href={href}
            className="line-clamp-2 transition-colors duration-200 group-hover:text-brand-700 after:absolute after:inset-0 after:content-['']"
          >
            {course.title}
          </Link>
        </h3>

        <p className="mt-1.5 truncate text-[13px] text-ink-muted">
          {course.creator.displayName}
          {course.creator.isVerified && (
            <span className="ms-1 inline-block align-middle text-brand-500" title={t.admin.verify}>
              <Icon name="check" size={12} />
            </span>
          )}
        </p>

        {course.ratingCount > 0 ? (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-warn-700">{formatRating(course.ratingAvg)}</span>
            <Stars rating={course.ratingAvg} size={13} />
            <span className="text-[12px] text-ink-subtle">({formatCount(course.ratingCount, locale)})</span>
          </div>
        ) : (
          <div className="mt-2.5 text-[12px] text-ink-subtle">{t.reviews.noReviews}</div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-subtle">
          <span className="inline-flex items-center gap-1">
            <Icon name="video" size={12} />
            {course.lessonCount}
          </span>
          {course.durationSeconds > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={12} />
              {formatDuration(course.durationSeconds, locale)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Icon name="users" size={12} />
            {formatCount(course.studentCount, locale)}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-bold tracking-tight text-ink">
              {formatMoney(price, course.currency, {
                freeLabel: t.common.free,
                locale: locale === "en" ? "en-GB" : "ka-GE",
                hideDecimalsWhenWhole: true,
              })}
            </span>
            {discount !== null && (
              <span className="text-[13px] text-ink-subtle line-through">
                {formatMoney(course.priceMinor, course.currency, { hideDecimalsWhenWhole: true })}
              </span>
            )}
          </div>
          <span className="rounded-md bg-surface-sunken px-2 py-1 text-[11px] font-medium text-ink-muted">
            {levelLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton({ variant = "grid" }: { variant?: "grid" | "rail" }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface",
        variant === "rail" && "w-[17rem] shrink-0",
      )}
    >
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/5 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-5 w-16 rounded" />
      </div>
    </div>
  );
}
