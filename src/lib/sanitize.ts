/**
 * XSS defence for user-authored rich text.
 *
 * React escapes everything by default, so the ONLY place untrusted text can
 * become markup is `dangerouslySetInnerHTML`. Lesson bodies and course
 * descriptions are authored by creators and need basic formatting, so they run
 * through this allow-list sanitiser first.
 *
 * The approach is allow-list, not deny-list: anything not explicitly permitted
 * is stripped. That means no <script>, no <iframe>, no event handlers, no
 * javascript:/data: URLs, and no <style>.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
  "h2", "h3", "h4", "blockquote", "code", "pre", "a", "hr", "span",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
};

const SAFE_URL = /^(https?:\/\/|mailto:|\/)/i;

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  let out = input
    // Drop whole dangerous elements including their contents.
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, "")
    // Comments can hide conditional markup.
    .replace(/<!--[\s\S]*?-->/g, "");

  out = out.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_match, closing: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return `</${tag}>`;

      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed) return `<${tag}>`;

      const kept: string[] = [];
      const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let m: RegExpExecArray | null;
      while ((m = attrPattern.exec(rawAttrs)) !== null) {
        const name = m[1]!.toLowerCase();
        const value = (m[3] ?? m[4] ?? "").trim();
        // on* handlers are never allowed, whatever the tag.
        if (name.startsWith("on") || !allowed.has(name)) continue;
        if (name === "href" && !SAFE_URL.test(value)) continue;
        kept.push(`${name}="${escapeAttr(value)}"`);
      }

      // External links get rel protection against tab-nabbing.
      if (tag === "a" && kept.some((a) => a.startsWith("href=\"http"))) {
        kept.push('target="_blank"', 'rel="noopener noreferrer nofollow"');
      }

      return `<${tag}${kept.length ? ` ${kept.join(" ")}` : ""}>`;
    });

  return out;
}

const escapeAttr = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Strip all markup — for meta descriptions and card excerpts. */
export function toPlainText(input: string | null | undefined, maxLength?: number): string {
  if (!input) return "";
  const text = input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}

/**
 * Render plain text (with paragraph breaks) as safe HTML.
 * Used for creator-written descriptions typed into a plain textarea.
 */
export function paragraphsToHtml(input: string | null | undefined): string {
  if (!input) return "";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return input
    .split(/\n{2,}/)
    .map((block) => `<p>${esc(block.trim()).replace(/\n/g, "<br>")}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("");
}
