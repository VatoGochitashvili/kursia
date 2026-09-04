"use client";

import { useId, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

/**
 * Dashboard charts.
 *
 * Hand-rolled SVG rather than a charting library: these are two shapes, and a
 * 60–150KB dependency would dwarf the rest of the dashboard bundle.
 *
 * Design rules applied deliberately:
 *  • One y-axis. Never two scales on one plot.
 *  • Single series ⇒ no legend; the heading names it. Two series ⇒ legend AND
 *    direct labels, so identity never depends on colour alone.
 *  • Series colours are the validated pair (#213ade / #c72b07): CVD-separated
 *    and ≥3:1 against the chart surface.
 *  • Grid and axes are recessive; values are direct-labelled selectively
 *    (max point only), never on every point.
 *  • A hover layer is standard, plus a screen-reader table of the same data.
 */

export interface SeriesPoint {
  date: string;
  revenueMinor: number;
  sales: number;
}

const SERIES_COLOR = "#213ade";
const SERIES_COLOR_ALT = "#c72b07";

interface Geometry {
  width: number;
  height: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
}

const GEO: Geometry = {
  width: 720,
  height: 220,
  padTop: 16,
  padRight: 16,
  padBottom: 26,
  padLeft: 48,
};

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Revenue over time. Area + line, single series. */
export function RevenueChart({
  data,
  currency,
  locale,
  title,
  emptyLabel,
  className,
}: {
  data: SeriesPoint[];
  currency: string;
  locale: Locale;
  title: string;
  emptyLabel: string;
  className?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { points, max, plotWidth, plotHeight } = useMemo(() => {
    const plotW = GEO.width - GEO.padLeft - GEO.padRight;
    const plotH = GEO.height - GEO.padTop - GEO.padBottom;
    const peak = niceMax(Math.max(...data.map((d) => d.revenueMinor), 0));
    const step = data.length > 1 ? plotW / (data.length - 1) : 0;

    return {
      max: peak,
      plotWidth: plotW,
      plotHeight: plotH,
      points: data.map((point, index) => ({
        ...point,
        x: GEO.padLeft + index * step,
        y: GEO.padTop + plotH - (point.revenueMinor / peak) * plotH,
      })),
    };
  }, [data]);

  const hasData = data.some((d) => d.revenueMinor > 0);
  const peakIndex = data.reduce(
    (best, point, index) => (point.revenueMinor > (data[best]?.revenueMinor ?? -1) ? index : best),
    0,
  );

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1]!.x} ${GEO.padTop + plotHeight} L${points[0]!.x} ${
          GEO.padTop + plotHeight
        } Z`
      : "";

  const active = hover !== null ? points[hover] : null;

  return (
    <figure className={cn("m-0", className)}>
      <figcaption className="mb-3 text-[13px] font-semibold text-ink">{title}</figcaption>

      {!hasData ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-line-strong text-[13px] text-ink-subtle">
          {emptyLabel}
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${GEO.width} ${GEO.height}`}
            className="w-full"
            role="img"
            aria-label={title}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity="0.18" />
                <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Recessive gridlines + y labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = GEO.padTop + plotHeight - ratio * plotHeight;
              return (
                <g key={ratio}>
                  <line
                    x1={GEO.padLeft}
                    x2={GEO.width - GEO.padRight}
                    y1={y}
                    y2={y}
                    stroke="#e6e8ee"
                    strokeWidth="1"
                  />
                  <text
                    x={GEO.padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink-subtle text-[10px] tabular-nums"
                  >
                    {formatMoney(Math.round(max * ratio), currency, {
                      hideDecimalsWhenWhole: true,
                    })}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={SERIES_COLOR}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Direct label on the peak only — never a number on every point. */}
            {points[peakIndex] && (
              <>
                <circle
                  cx={points[peakIndex]!.x}
                  cy={points[peakIndex]!.y}
                  r="4"
                  fill={SERIES_COLOR}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={points[peakIndex]!.x}
                  y={Math.max(points[peakIndex]!.y - 12, 12)}
                  textAnchor="middle"
                  className="fill-ink text-[11px] font-semibold tabular-nums"
                >
                  {formatMoney(points[peakIndex]!.revenueMinor, currency, {
                    hideDecimalsWhenWhole: true,
                  })}
                </text>
              </>
            )}

            {/* Crosshair */}
            {active && (
              <g>
                <line
                  x1={active.x}
                  x2={active.x}
                  y1={GEO.padTop}
                  y2={GEO.padTop + plotHeight}
                  stroke="#8a93a1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={active.x}
                  cy={active.y}
                  r="5"
                  fill={SERIES_COLOR}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Hit targets, wider than the marks. */}
            {points.map((point, index) => (
              <rect
                key={point.date}
                x={point.x - plotWidth / Math.max(points.length - 1, 1) / 2}
                y={GEO.padTop}
                width={plotWidth / Math.max(points.length - 1, 1)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
              />
            ))}

            {/* Sparse x labels so they never collide. */}
            {points
              .filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2))
              .map((point) => (
                <text
                  key={`x-${point.date}`}
                  x={point.x}
                  y={GEO.height - 8}
                  textAnchor="middle"
                  className="fill-ink-subtle text-[10px]"
                >
                  {formatShortDate(point.date, locale).slice(0, 5)}
                </text>
              ))}
          </svg>

          {active && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg"
              style={{
                left: `${(active.x / GEO.width) * 100}%`,
                top: `${(active.y / GEO.height) * 100}%`,
              }}
            >
              <div className="font-semibold tabular-nums">
                {formatMoney(active.revenueMinor, currency)}
              </div>
              <div className="text-white/60">{formatShortDate(active.date, locale)}</div>
            </div>
          )}
        </div>
      )}

      {/* Same data as a table — identity and values never depend on the plot. */}
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-ink-subtle">
          {locale === "en" ? "View as table" : "ცხრილის სახით"}
        </summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-line">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-surface-muted">
              <tr>
                <th className="px-2 py-1 text-start font-semibold">
                  {locale === "en" ? "Date" : "თარიღი"}
                </th>
                <th className="px-2 py-1 text-end font-semibold">
                  {locale === "en" ? "Revenue" : "შემოსავალი"}
                </th>
                <th className="px-2 py-1 text-end font-semibold">
                  {locale === "en" ? "Sales" : "გაყიდვები"}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.date} className="border-t border-line">
                  <td className="px-2 py-1">{formatShortDate(row.date, locale)}</td>
                  <td className="px-2 py-1 text-end tabular-nums">
                    {formatMoney(row.revenueMinor, currency)}
                  </td>
                  <td className="px-2 py-1 text-end tabular-nums">{row.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Daily sales counts. Single-series bars with rounded data-ends. */
export function SalesBarChart({
  data,
  locale,
  title,
  emptyLabel,
  className,
}: {
  data: SeriesPoint[];
  locale: Locale;
  title: string;
  emptyLabel: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = GEO.width - GEO.padLeft - GEO.padRight;
  const plotH = GEO.height - GEO.padTop - GEO.padBottom;
  const max = niceMax(Math.max(...data.map((d) => d.sales), 0));
  // A 2px surface gap between adjacent bars.
  const slot = plotW / Math.max(data.length, 1);
  const barWidth = Math.max(slot - 2, 2);
  const hasData = data.some((d) => d.sales > 0);

  return (
    <figure className={cn("m-0", className)}>
      <figcaption className="mb-3 text-[13px] font-semibold text-ink">{title}</figcaption>

      {!hasData ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-line-strong text-[13px] text-ink-subtle">
          {emptyLabel}
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${GEO.width} ${GEO.height}`}
            className="w-full"
            role="img"
            aria-label={title}
            onMouseLeave={() => setHover(null)}
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = GEO.padTop + plotH - ratio * plotH;
              return (
                <g key={ratio}>
                  <line
                    x1={GEO.padLeft}
                    x2={GEO.width - GEO.padRight}
                    y1={y}
                    y2={y}
                    stroke="#e6e8ee"
                    strokeWidth="1"
                  />
                  <text
                    x={GEO.padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink-subtle text-[10px] tabular-nums"
                  >
                    {Math.round(max * ratio)}
                  </text>
                </g>
              );
            })}

            {data.map((point, index) => {
              const height = (point.sales / max) * plotH;
              const x = GEO.padLeft + index * slot + 1;
              const y = GEO.padTop + plotH - height;
              return (
                <g key={point.date}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(height, point.sales > 0 ? 2 : 0)}
                    rx="2"
                    fill={SERIES_COLOR}
                    opacity={hover === null || hover === index ? 1 : 0.45}
                  />
                  <rect
                    x={x}
                    y={GEO.padTop}
                    width={barWidth}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(index)}
                  />
                </g>
              );
            })}
          </svg>

          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg"
              style={{
                left: `${((GEO.padLeft + hover * slot + barWidth / 2) / GEO.width) * 100}%`,
                top: `${((GEO.padTop + plotH - (data[hover]!.sales / max) * plotH) / GEO.height) * 100}%`,
              }}
            >
              <div className="font-semibold tabular-nums">
                {data[hover]!.sales} {locale === "en" ? "sales" : "გაყიდვა"}
              </div>
              <div className="text-white/60">{formatShortDate(data[hover]!.date, locale)}</div>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/**
 * Horizontal comparison bars (e.g. revenue by course).
 * Value labels sit outside the bar, so identity never rests on colour.
 */
export function RankedBars({
  rows,
  currency,
  title,
  emptyLabel,
  locale,
}: {
  rows: { label: string; value: number; href?: string }[];
  currency: string;
  title: string;
  emptyLabel: string;
  locale: Locale;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-[13px] font-semibold text-ink">{title}</figcaption>
      {rows.length === 0 ? (
        <p className="text-[13px] text-ink-subtle">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] text-ink">{row.label}</span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                  {formatMoney(row.value, currency, { hideDecimalsWhenWhole: true })}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(row.value / max) * 100}%`,
                    backgroundColor: SERIES_COLOR,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

export const CHART_COLORS = { primary: SERIES_COLOR, secondary: SERIES_COLOR_ALT };
