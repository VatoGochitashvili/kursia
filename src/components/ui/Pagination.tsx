import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Real <a> links so search engines can follow pagination and users can open
 * pages in a new tab. rel=prev/next helps crawlers understand the sequence.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  labels,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; page: string };
}) {
  if (totalPages <= 1) return null;

  const window: number[] = [];
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, Math.max(page + 2, 5));
  for (let i = from; i <= to; i++) window.push(i);

  return (
    <nav aria-label={labels.page} className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        rel="prev"
        aria-label={labels.previous}
      >
        <Icon name="chevronLeft" size={16} />
      </PageLink>

      {from > 1 && (
        <>
          <PageLink href={buildHref(1)}>1</PageLink>
          {from > 2 && <span className="px-1 text-ink-subtle">…</span>}
        </>
      )}

      {window.map((n) => (
        <PageLink key={n} href={buildHref(n)} current={n === page}>
          {n}
        </PageLink>
      ))}

      {to < totalPages && (
        <>
          {to < totalPages - 1 && <span className="px-1 text-ink-subtle">…</span>}
          <PageLink href={buildHref(totalPages)}>{totalPages}</PageLink>
        </>
      )}

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        rel="next"
        aria-label={labels.next}
      >
        <Icon name="chevronRight" size={16} />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current,
  disabled,
  rel,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  rel?: string;
  "aria-label"?: string;
}) {
  const className = cn(
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors",
    current
      ? "bg-brand-600 text-white"
      : "border border-line-strong text-ink-muted hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={className} aria-hidden="true" {...rest}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} rel={rel} aria-current={current ? "page" : undefined} {...rest}>
      {children}
    </Link>
  );
}
