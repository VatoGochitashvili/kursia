import type { Locale } from "@/lib/enums";

/**
 * Display formatting.
 *
 * DETERMINISM CONTRACT
 * ────────────────────
 * Everything here that can be rendered on the SERVER is formatted by hand,
 * never through `Intl`. That is not stylistic: `Intl` output depends on the
 * runtime's ICU data, and Node (full ICU) and a browser can disagree for
 * `ka-GE` — Node renders `₾89,10` / `05.08.2026`, a browser without Georgian
 * data renders `₾89.10` / `08/05/2026`. Any such difference is a real React
 * hydration mismatch that blanks and re-renders the page.
 *
 * Nothing here calls `Intl` at all, so the same input produces the same string
 * in Node, in Chrome, and in a browser build with Georgian locale data
 * stripped out.
 */

/** Georgian month names, nominative — used for long dates. */
const MONTHS_KA = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toDate = (value: Date | string): Date =>
  typeof value === "string" ? new Date(value) : value;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Group digits with a thin separator: 1234567.89 → "1,234,567.89".
 * Fixed separators (`,` thousands / `.` decimal) so the string is identical
 * on every runtime — the convention Georgian e-commerce most commonly shows.
 */
export function formatNumber(value: number, fractionDigits = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "−" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

/** 5400 → "1 სთ 30 წთ" · 240 → "4 წთ" */
export function formatDuration(seconds: number, locale: Locale = "ka"): string {
  if (!seconds || seconds < 0) return locale === "en" ? "0 min" : "0 წთ";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  const hLabel = locale === "en" ? "h" : "სთ";
  const mLabel = locale === "en" ? "min" : "წთ";
  if (h === 0) return `${m} ${mLabel}`;
  if (m === 0) return `${h} ${hLabel}`;
  return `${h} ${hLabel} ${m} ${mLabel}`;
}

/** 3725 → "1:02:05" — for the video player scrubber. */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "5 აგვისტო 2026" · "5 August 2026" */
export function formatDate(date: Date | string, locale: Locale = "ka"): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  const month = (locale === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()] ?? "";
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** "05.08.2026" — the numeric form used across Georgia. */
export function formatShortDate(date: Date | string, locale: Locale = "ka"): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()];
  return locale === "en" ? parts.join("/") : parts.join(".");
}

/** "05.08.2026 14:30" */
export function formatDateTime(date: Date | string, locale: Locale = "ka"): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatShortDate(d, locale)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 12500 → "12.5ათ" — compact counts on cards. */
export function formatCount(n: number, locale: Locale = "ka"): string {
  if (n < 1000) return String(n);
  const value = n / 1000;
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return locale === "en" ? `${rounded}k` : `${rounded}ათ`;
}

export function formatRating(rating: number): string {
  return rating > 0 ? rating.toFixed(1) : "—";
}

/**
 * Relative time ("5 days ago" / "5 დღის წინ").
 *
 * CLIENT-ONLY. It reads Date.now(), so a server render could never match the
 * client — render it through <TimeAgo>, which paints an absolute date first
 * and upgrades after mount.
 *
 * Written by hand rather than with `Intl.RelativeTimeFormat`: browsers ship
 * inconsistent Georgian locale data, and a stripped build silently falls back
 * to English. Georgian has no plural agreement for counted nouns, so a single
 * form per unit is correct.
 */
const RELATIVE_UNITS: { ms: number; ka: string; en: [string, string] }[] = [
  { ms: 31_536_000_000, ka: "წლის", en: ["year", "years"] },
  { ms: 2_592_000_000, ka: "თვის", en: ["month", "months"] },
  { ms: 604_800_000, ka: "კვირის", en: ["week", "weeks"] },
  { ms: 86_400_000, ka: "დღის", en: ["day", "days"] },
  { ms: 3_600_000, ka: "საათის", en: ["hour", "hours"] },
  { ms: 60_000, ka: "წუთის", en: ["minute", "minutes"] },
];

export function relativeTime(date: Date | string, locale: Locale = "ka"): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = d.getTime() - Date.now();
  const past = diffMs <= 0;
  const abs = Math.abs(diffMs);

  if (abs < 60_000) {
    return locale === "en" ? "just now" : "ახლახან";
  }

  for (const unit of RELATIVE_UNITS) {
    if (abs < unit.ms) continue;
    const value = Math.round(abs / unit.ms);
    if (locale === "en") {
      const word = value === 1 ? unit.en[0] : unit.en[1];
      return past ? `${value} ${word} ago` : `in ${value} ${word}`;
    }
    return past ? `${value} ${unit.ka} წინ` : `${value} ${unit.ka} შემდეგ`;
  }

  return formatShortDate(d, locale);
}

/** 1536000 → "1.5 MB" — file sizes in lesson resources. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
