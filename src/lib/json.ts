/**
 * Structured fields are stored as JSON strings so the schema stays portable
 * between SQLite and PostgreSQL. These helpers never throw on bad data — a
 * corrupt column degrades to a safe default rather than 500-ing a page.
 */

export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  } catch {
    return [];
  }
}

export function serializeStringArray(items: readonly string[] | null | undefined): string | null {
  if (!items) return null;
  const clean = items.map((s) => s.trim()).filter(Boolean);
  return clean.length ? JSON.stringify(clean) : null;
}

export function parseObject<T extends Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? ({ ...fallback, ...v } as T) : fallback;
  } catch {
    return fallback;
  }
}

export const serializeObject = (v: unknown): string | null =>
  v === null || v === undefined ? null : JSON.stringify(v);
