import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Card surface used across the marketplace and dashboards. */
export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "article" | "section" | "li";
}) {
  return (
    <As className={cn("rounded-2xl border border-line bg-surface", className)}>{children}</As>
  );
}

type BadgeTone = "brand" | "accent" | "neutral" | "success" | "warn" | "danger" | "dark";

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  accent: "bg-accent-50 text-accent-700 ring-accent-100",
  neutral: "bg-surface-sunken text-ink-muted ring-line",
  success: "bg-success-50 text-success-700 ring-success-500/20",
  warn: "bg-warn-50 text-warn-700 ring-warn-500/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-500/20",
  dark: "bg-ink text-white ring-ink",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Star rating. Renders as accessible text for screen readers. */
export function Stars({
  rating,
  size = 14,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span
      className={cn("inline-flex items-center gap-px", className)}
      role="img"
      aria-label={`${rating.toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return <Star key={i} fill={fill} size={size} />;
      })}
    </span>
  );
}

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `star-${fill}`;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      {fill === 0.5 && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="#f79009" />
            <stop offset="50%" stopColor="#e6e8ee" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M10 1.5l2.6 5.3 5.8.85-4.2 4.1 1 5.8L10 14.8l-5.2 2.75 1-5.8L1.6 7.65l5.8-.85L10 1.5z"
        fill={fill === 1 ? "#f79009" : fill === 0.5 ? `url(#${id})` : "#e6e8ee"}
      />
    </svg>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "brand",
  showLabel,
}: {
  value: number;
  className?: string;
  tone?: "brand" | "success";
  showLabel?: boolean;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "success" ? "bg-success-500" : "bg-brand-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-muted">{pct}%</span>
      )}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from
      // arbitrary user-configured hosts; next/image would need every one
      // allow-listed at build time.
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cn("shrink-0 rounded-full bg-surface-sunken object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-muted px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="mb-4 text-ink-subtle">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "brand",
  title,
  children,
  className,
}: {
  tone?: "brand" | "success" | "warn" | "danger";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: "border-brand-200 bg-brand-50 text-brand-900",
    success: "border-success-500/25 bg-success-50 text-success-700",
    warn: "border-warn-500/25 bg-warn-50 text-warn-700",
    danger: "border-danger-500/25 bg-danger-50 text-danger-700",
  } as const;
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)} role="status">
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

/** Stat tile for dashboards. */
export function Stat({
  label,
  value,
  hint,
  trend,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: number; label?: string };
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        {icon && <span className="text-ink-subtle">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{value}</p>
      {(hint || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "font-semibold tabular-nums",
                trend.value >= 0 ? "text-success-700" : "text-danger-700",
              )}
            >
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
            </span>
          )}
          {hint && <span className="text-ink-subtle">{hint}</span>}
        </div>
      )}
    </Card>
  );
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="breadcrumb" className={cn("text-[13px] text-ink-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-subtle">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-600 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Server-rendered JSON-LD. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Content is built server-side from our own database values, and
      // JSON.stringify escapes the payload; `<` is additionally escaped so a
      // course title can never break out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-line", className)} />;
}

export function Tag({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-danger-700">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-subtle transition-colors focus:border-brand-400 focus:outline-none " +
  "focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface-sunken disabled:text-ink-subtle";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(CONTROL, "min-h-24 resize-y", className)} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(CONTROL, "cursor-pointer pr-8", className)}>
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      {...props}
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-2 focus:ring-brand-500/30",
        className,
      )}
    />
  );
}
