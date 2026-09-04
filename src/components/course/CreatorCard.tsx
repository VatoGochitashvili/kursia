import Link from "next/link";
import type { CreatorCard as CreatorCardData } from "@/lib/courses";
import { formatCount, formatRating } from "@/lib/format";
import { Avatar, Stars } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

export function CreatorCard({
  creator,
  locale,
  t,
  className,
}: {
  creator: CreatorCardData;
  locale: Locale;
  t: Dictionary;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg",
        className,
      )}
    >
      <Avatar src={creator.avatarUrl} name={creator.displayName} size={72} />

      <h3 className="mt-3.5 text-[15px] font-bold text-ink">
        <Link
          href={localePath(`/creator/${creator.slug}`, locale)}
          className="after:absolute after:inset-0 after:content-['']"
        >
          {creator.displayName}
        </Link>
        {creator.isVerified && (
          <span className="ms-1 inline-block align-middle text-brand-500" title={t.admin.verify}>
            <Icon name="check" size={13} />
          </span>
        )}
      </h3>

      {creator.headline && (
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-muted">{creator.headline}</p>
      )}

      {creator.ratingCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-warn-700">{formatRating(creator.ratingAvg)}</span>
          <Stars rating={creator.ratingAvg} size={12} />
        </div>
      )}

      <dl className="mt-4 grid w-full grid-cols-2 gap-2 border-t border-line pt-4 text-center">
        <div>
          <dt className="text-[11px] text-ink-subtle">{t.common.students}</dt>
          <dd className="text-sm font-bold tabular-nums text-ink">
            {formatCount(creator.studentCount, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-subtle">{t.nav.courses}</dt>
          <dd className="text-sm font-bold tabular-nums text-ink">{creator.courseCount}</dd>
        </div>
      </dl>
    </article>
  );
}
