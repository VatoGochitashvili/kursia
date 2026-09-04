/**
 * SEO-friendly slugs from Georgian (or English) titles.
 *
 * Georgian script is not indexable in URLs in a readable way and percent-
 * encoding produces unusable links, so titles are transliterated to Latin
 * using the Georgian national romanisation convention. The Georgian title
 * still lives in the <h1>, <title> and structured data — the slug only has to
 * be stable, readable and unique.
 *
 *   "ციფრული მარკეტინგის საფუძვლები" → "tsipruli-marketingis-sapudzvlebi"
 */

const GEORGIAN_TO_LATIN: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t",
  ი: "i", კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o", პ: "p", ჟ: "zh",
  რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "p", ქ: "k", ღ: "gh", ყ: "q",
  შ: "sh", ჩ: "ch", ც: "ts", ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh",
  ჯ: "j", ჰ: "h",
  // Archaic letters, still encountered in names and older texts.
  ჱ: "e", ჲ: "y", ჳ: "w", ჴ: "kh", ჵ: "o", ჶ: "f", ჷ: "e", ჸ: "",
};

export function transliterateGeorgian(input: string): string {
  let out = "";
  for (const ch of input) out += GEORGIAN_TO_LATIN[ch] ?? ch;
  return out;
}

export function slugify(input: string, maxLength = 80): string {
  const base = transliterateGeorgian(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/['’"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) return "";
  return base.length <= maxLength
    ? base
    : base.slice(0, maxLength).replace(/-+[^-]*$/, "").replace(/-+$/, "");
}

/**
 * Slugify, then ask the caller whether the candidate is taken, appending
 * -2, -3 … until it is free. Falls back to a random suffix for titles that
 * transliterate to nothing.
 */
export async function uniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
  opts: { maxLength?: number; fallbackPrefix?: string } = {},
): Promise<string> {
  const base = slugify(title, opts.maxLength ?? 80) || `${opts.fallbackPrefix ?? "item"}`;
  if (!(await isTaken(base))) return base;
  for (let n = 2; n <= 60; n++) {
    const candidate = `${base}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Username handles: latin, digits, dot/underscore, no leading/trailing punct. */
export function normalizeUsername(input: string): string {
  return transliterateGeorgian(input)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 30);
}
