/** Minimal className joiner — avoids a dependency for a five-line utility. */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
