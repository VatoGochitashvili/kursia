/**
 * The brand mark: წრე — "circle".
 *
 * A ring with three dots inside it. The ring is the circle you join; the dots
 * are the people already in it. Three rather than more because at favicon
 * size anything denser closes up into a smudge, and three is the smallest
 * number that reads as "a group" rather than "a dot".
 *
 * Deliberately not a ring with a single dot on its edge — that shape is a
 * loading spinner everywhere else on the web, and a logo that reads as "still
 * loading" is a bad first impression.
 *
 * Recolourable via currentColor so it works on the brand badge, on white and
 * inverted in a footer.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brand-600 text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="8.6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeOpacity="0.92"
        />
        <circle cx="12" cy="7.7" r="1.7" fill="currentColor" />
        <circle cx="8.28" cy="14.15" r="1.7" fill="currentColor" />
        <circle cx="15.72" cy="14.15" r="1.7" fill="currentColor" />
      </svg>
    </span>
  );
}
