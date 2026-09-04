import { formatNumber } from "@/lib/format";

/**
 * Money is ALWAYS an integer count of minor units (tetri for GEL) — never a
 * float, never a string. All arithmetic happens on integers so a sale can
 * never lose a tetri to binary rounding.
 */

export type CurrencyCode = "GEL" | "USD" | "EUR";

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  minorUnits: number;
  /** Symbol before or after the amount, per local convention. */
  position: "prefix" | "suffix";
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  GEL: { code: "GEL", symbol: "₾", minorUnits: 100, position: "prefix" },
  USD: { code: "USD", symbol: "$", minorUnits: 100, position: "prefix" },
  EUR: { code: "EUR", symbol: "€", minorUnits: 100, position: "prefix" },
};

export function currencyMeta(code: string): CurrencyMeta {
  return CURRENCIES[code as CurrencyCode] ?? CURRENCIES.GEL;
}

/** "49.99" | 49.99 → 4999 */
export function toMinor(amount: string | number, code = "GEL"): number {
  const { minorUnits } = currencyMeta(code);
  const n = typeof amount === "string" ? Number(amount.replace(",", ".")) : amount;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * minorUnits);
}

/** 4999 → 49.99 (for display/inputs only — never for arithmetic) */
export function toMajor(minor: number, code = "GEL"): number {
  return minor / currencyMeta(code).minorUnits;
}

/**
 * 4999 → "₾49.99"  ·  0 → "უფასო" when `freeLabel` is given.
 *
 * Formatted by hand rather than through `Intl.NumberFormat`: the same money
 * string is rendered on the server and re-rendered on the client, and ICU data
 * for `ka-GE` is not present in every browser — a mismatch there is a React
 * hydration error, not a cosmetic difference. See src/lib/format.ts.
 */
export function formatMoney(
  minor: number,
  code = "GEL",
  opts: { freeLabel?: string; locale?: string; hideDecimalsWhenWhole?: boolean } = {},
): string {
  if (minor === 0 && opts.freeLabel) return opts.freeLabel;
  const meta = currencyMeta(code);
  const major = toMajor(minor, code);
  const whole = minor % meta.minorUnits === 0;
  const digits = opts.hideDecimalsWhenWhole && whole ? 0 : 2;
  const num = formatNumber(major, digits);
  return meta.position === "prefix" ? `${meta.symbol}${num}` : `${num} ${meta.symbol}`;
}

/** The price a buyer actually pays: discount when it is a genuine reduction. */
export function effectivePriceMinor(priceMinor: number, discountPriceMinor: number | null): number {
  if (discountPriceMinor === null || discountPriceMinor === undefined) return priceMinor;
  if (discountPriceMinor < 0 || discountPriceMinor >= priceMinor) return priceMinor;
  return discountPriceMinor;
}

export function discountPercent(priceMinor: number, discountPriceMinor: number | null): number | null {
  if (!priceMinor || discountPriceMinor === null || discountPriceMinor >= priceMinor) return null;
  return Math.round(((priceMinor - discountPriceMinor) / priceMinor) * 100);
}

/**
 * Split a sale into platform fee and creator earnings.
 * Basis points keep fractional percentages exact (e.g. 12.5% = 1250 bps).
 * The creator receives the remainder, so fee + earnings always == amount.
 */
export function splitSale(
  amountMinor: number,
  commissionBps: number,
  processingFeeMinor = 0,
): { platformFeeMinor: number; processingFeeMinor: number; creatorEarningsMinor: number } {
  const bps = Math.min(Math.max(Math.round(commissionBps), 0), 10_000);
  const platformFeeMinor = Math.round((amountMinor * bps) / 10_000);
  const processing = Math.min(Math.max(processingFeeMinor, 0), amountMinor - platformFeeMinor);
  return {
    platformFeeMinor,
    processingFeeMinor: processing,
    creatorEarningsMinor: amountMinor - platformFeeMinor - processing,
  };
}

export const bpsToPercent = (bps: number) => bps / 100;
export const percentToBps = (pct: number) => Math.round(pct * 100);
