"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroups {
  categories: FilterOption[];
  levels: FilterOption[];
  languages: FilterOption[];
}

/**
 * Filters write to the URL and let the server re-render the results, so every
 * filtered view is a real, shareable, crawlable URL — and the page keeps
 * working with JavaScript disabled through the <noscript> form fallback.
 */
export function CourseFilters({
  groups,
  labels,
  activeCount,
}: {
  groups: FilterGroups;
  labels: Record<string, string>;
  activeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
      next.delete("page"); // any filter change resets pagination
      router.push(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const current = (key: string, fallback = "all") => params.get(key) ?? fallback;

  const body = (
    <div className="space-y-6">
      <FilterSection title={labels.price}>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: "all", label: labels.priceAll },
            { value: "free", label: labels.priceFree },
            { value: "paid", label: labels.pricePaid },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParam("price", opt.value)}
              aria-pressed={current("price") === opt.value}
              className={cn(
                "rounded-lg border px-2 py-2 text-[13px] font-medium transition-colors",
                current("price") === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-line-strong text-ink-muted hover:bg-surface-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {groups.categories.length > 0 && (
        <FilterSection title={labels.category}>
          <RadioList
            name="category"
            options={[{ value: "all", label: labels.all }, ...groups.categories]}
            value={current("category")}
            onChange={(v) => setParam("category", v)}
          />
        </FilterSection>
      )}

      <FilterSection title={labels.level}>
        <RadioList
          name="level"
          options={[{ value: "all", label: labels.all }, ...groups.levels]}
          value={current("level")}
          onChange={(v) => setParam("level", v)}
        />
      </FilterSection>

      <FilterSection title={labels.rating}>
        <div className="space-y-1">
          {[4.5, 4, 3.5, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setParam("rating", current("rating", "") === String(r) ? null : String(r))}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                current("rating", "") === String(r)
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-muted hover:bg-surface-muted",
              )}
            >
              <Stars rating={r} size={13} />
              <span>{labels.ratingAndUp.replace("{n}", String(r))}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {groups.languages.length > 1 && (
        <FilterSection title={labels.language}>
          <RadioList
            name="language"
            options={[{ value: "all", label: labels.all }, ...groups.languages]}
            value={current("language")}
            onChange={(v) => setParam("language", v)}
          />
        </FilterSection>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams();
            const q = params.get("q");
            if (q) next.set("q", q);
            router.push(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-danger-700 hover:underline"
        >
          <Icon name="close" size={14} />
          {labels.clearAll}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold text-ink lg:hidden"
      >
        <Icon name="filter" size={16} />
        {labels.filters}
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <aside className="hidden lg:block">{body}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-fade-up overflow-y-auto rounded-t-3xl bg-surface p-5 safe-b">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{labels.filters}</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={labels.close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            {body}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-6 h-12 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white"
            >
              {labels.apply}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[13px] font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function RadioList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
            value === opt.value ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-muted hover:bg-surface-muted",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-3.5 w-3.5 border-line-strong text-brand-600 focus:ring-brand-500/30"
            />
            <span className="truncate">{opt.label}</span>
          </span>
          {opt.count !== undefined && (
            <span className="shrink-0 text-[11px] tabular-nums text-ink-subtle">{opt.count}</span>
          )}
        </label>
      ))}
    </div>
  );
}

export function SortSelect({
  options,
  label,
}: {
  options: FilterOption[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
      <span className="hidden sm:inline">{label}:</span>
      <select
        value={params.get("sort") ?? "relevance"}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "relevance") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          router.push(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
        }}
        className="h-10 cursor-pointer rounded-xl border border-line-strong bg-surface px-3 pr-8 text-[13px] font-medium text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
