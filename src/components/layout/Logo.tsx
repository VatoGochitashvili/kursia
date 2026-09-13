/**
 * The brand mark: წრე — "circle".
 *
 * Eight dots in a ring, and nothing in the middle. The circle is not drawn;
 * the people standing in it are, and the ring is the shape they make. That is
 * the whole product in one figure, and it is a mark nobody else on this shelf
 * is using.
 *
 * No stroked ring at all, which is what keeps it legible small: a thin circle
 * plus dots inside it was the previous mark, and below 24px the two closed up
 * against each other into a smudge. Dots alone have nothing to collide with.
 *
 * The slow turn on hover is the only motion. A mark that spins on its own is
 * a loading spinner; one that answers the cursor is alive. It is disabled
 * under prefers-reduced-motion by the global rule in globals.css.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="group/logo inline-flex items-center justify-center rounded-full bg-brand-600 text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.74}
        height={size * 0.74}
        viewBox="0 0 24 24"
        fill="none"
        className="origin-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/logo:rotate-45"
      >
        <circle cx="12.00" cy="4.50" r="1.72" fill="currentColor" />
        <circle cx="17.30" cy="6.70" r="1.72" fill="currentColor" />
        <circle cx="19.50" cy="12.00" r="1.72" fill="currentColor" />
        <circle cx="17.30" cy="17.30" r="1.72" fill="currentColor" />
        <circle cx="12.00" cy="19.50" r="1.72" fill="currentColor" />
        <circle cx="6.70" cy="17.30" r="1.72" fill="currentColor" />
        <circle cx="4.50" cy="12.00" r="1.72" fill="currentColor" />
        <circle cx="6.70" cy="6.70" r="1.72" fill="currentColor" />
      </svg>
    </span>
  );
}
