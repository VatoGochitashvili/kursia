/**
 * The brand mark for MyTSRE: a circle, which is what წრე means.
 *
 * One thin ring, drawn in the brand colour on nothing. No filled badge, no
 * dots, no motion.
 *
 * The two marks before this were a ring with dots inside and then eight dots
 * in a ring; both were busy, and busy is the opposite of what the name means.
 * A circle is the simplest shape there is, and the mark should be too — its
 * whole job is to sit quietly to the left of the word and let the word be the
 * logo.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-brand-600"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Stroke scaled to the box so the ring keeps its weight at any size
            instead of going spindly large and clogging small. */}
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    </span>
  );
}
