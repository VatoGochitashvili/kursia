import Link from "next/link";
import type { CreatorCard as CreatorCardData } from "@/lib/courses";
import { formatCount, formatRating } from "@/lib/format";
import { Avatar, Stars } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

/**
 * Cover gradients, picked from the creator's slug.
 *
 * Deterministic on purpose: the same creator must get the same band on the
 * server and in the browser, or React reports a hydration mismatch. Nothing
 * here may use Math.random() or the current time.
 */
const COVERS = [
  "linear-gradient(120deg, #3559f0, #7c3aed)",
  "linear-gradient(120deg, #f03c06, #f59e0b)",
  "linear-gradient(120deg, #12b76a, #0891b2)",
  "linear-gradient(120deg, #db2777, #9333ea)",
  "linear-gradient(120deg, #0284c7, #3559f0)",
  "linear-gradient(120deg, #e11d48, #f03c06)",
];

function coverFor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return COVERS[hash % COVERS.length]!;
}

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
        "group sheen relative flex flex-col items-center overflow-hidden rounded-2xl border border-line bg-surface text-center",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-xl",
        className,
      )}
    >
      {/* A coloured band gives the grid rhythm and stops six near-identical
          white cards from reading as a spreadsheet. */}
      <div
        aria-hidden="true"
        className="h-16 w-full transition-transform duration-500 group-hover:scale-105"
        style={{ background: coverFor(creator.slug) }}
      />

      <div className="-mt-9 flex w-full flex-1 flex-col items-center px-5 pb-5">
        <span className="rounded-full bg-surface p-1 shadow-sm ring-1 ring-line">
          <Avatar src={creator.avatarUrl} name={creator.displayName} size={64} />
        </span>

        <h3 className="mt-3 text-[15px] font-bold text-ink">
          <Link
            href={localePath(`/creator/${creator.slug}`, locale)}
            className="transition-colors duration-200 after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700"
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
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-muted">
            {creator.headline}
          </p>
        )}

        {creator.ratingCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-warn-700">
              {formatRating(creator.ratingAvg)}
            </span>
            <Stars rating={creator.ratingAvg} size={12} />
          </div>
        )}

        <dl className="mt-auto grid w-full grid-cols-2 gap-2 border-t border-line pt-4 text-center">
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
      </div>
    </article>
  );
}
