/**
 * The page's living background.
 *
 * Rings and dots, because the brand is წრე — a circle. It used to be outlined
 * glyphs of the things the catalogue sold; the product is now the circle
 * people join rather than the thing they buy, so the background says that
 * instead.
 *
 * A flat white page reads as unfinished, but a decorated one very easily
 * reads as cluttered — so this stays quiet: thin rings under ten percent
 * opacity, drifting slowly enough that the movement is felt rather than
 * watched.
 *
 * Even at the top of that range every ring is far below the point where it
 * could affect the contrast of text above it — the darkest is roughly a 4%
 * grey on white, against body copy at 7:1 and headings at 19:1.
 *
 * Three properties matter more than the look:
 *
 *  • It is a server component with pure-CSS animation. No JavaScript ships
 *    for it, and every animated property is transform/opacity, which the
 *    compositor owns — this must not compete with the page on a 0.1-CPU
 *    instance.
 *  • Every position, size, delay and duration is written down rather than
 *    generated. Math.random() here would place shapes differently on the
 *    server and in the browser, and React would report a hydration mismatch
 *    on every single page load.
 *  • It is `fixed` and behind everything, so it never affects layout, never
 *    intercepts a click, and scrolls under the content rather than with it.
 *
 * Cards and the muted bands sit above it, but the plain sections between them
 * have no background of their own — body copy really does read directly over
 * this, which is why the ceiling above is a ceiling and not a starting point.
 */

interface Ring {
  /** Percentages of the viewport. */
  left: number;
  top: number;
  /** Pixels, outer diameter. */
  size: number;
  /** Ring thickness in pixels. A dot is a ring thicker than its own radius. */
  thickness: number;
  /** Seconds. Spread so the field never pulses in unison. */
  duration: number;
  delay: number;
  opacity: number;
  /** A second ring inside the first — a circle within a circle. */
  inner?: boolean;
}

/**
 * Sizes vary widely on purpose: a field of same-size circles reads as a
 * pattern or a texture swatch, and the point here is depth, not wallpaper.
 */
const RINGS: Ring[] = [
  { left: 4, top: 12, size: 96, thickness: 1.5, duration: 26, delay: 0, opacity: 0.075, inner: true },
  { left: 88, top: 8, size: 64, thickness: 1.5, duration: 31, delay: -6, opacity: 0.08 },
  { left: 14, top: 62, size: 120, thickness: 1.5, duration: 34, delay: -12, opacity: 0.06, inner: true },
  { left: 78, top: 44, size: 74, thickness: 1.5, duration: 29, delay: -3, opacity: 0.08 },
  { left: 46, top: 82, size: 58, thickness: 1.5, duration: 37, delay: -18, opacity: 0.075 },
  { left: 92, top: 74, size: 88, thickness: 1.5, duration: 28, delay: -9, opacity: 0.065, inner: true },
  { left: 26, top: 30, size: 42, thickness: 1.5, duration: 33, delay: -21, opacity: 0.085 },
  { left: 62, top: 18, size: 52, thickness: 1.5, duration: 30, delay: -15, opacity: 0.075 },
  { left: 8, top: 88, size: 68, thickness: 1.5, duration: 35, delay: -7, opacity: 0.07 },
  { left: 70, top: 92, size: 104, thickness: 1.5, duration: 27, delay: -24, opacity: 0.06 },
  { left: 36, top: 6, size: 36, thickness: 1.5, duration: 32, delay: -11, opacity: 0.09 },
  { left: 56, top: 54, size: 46, thickness: 1.5, duration: 36, delay: -17, opacity: 0.07 },

  // Solid dots — thickness >= radius fills the circle, so one shape covers
  // both without a second code path.
  { left: 20, top: 46, size: 9, thickness: 5, duration: 24, delay: -4, opacity: 0.13 },
  { left: 68, top: 34, size: 7, thickness: 4, duration: 30, delay: -13, opacity: 0.12 },
  { left: 40, top: 70, size: 10, thickness: 5, duration: 28, delay: -20, opacity: 0.11 },
  { left: 84, top: 60, size: 7, thickness: 4, duration: 33, delay: -2, opacity: 0.12 },
  { left: 12, top: 24, size: 8, thickness: 4, duration: 26, delay: -16, opacity: 0.12 },
  { left: 52, top: 30, size: 6, thickness: 3, duration: 35, delay: -22, opacity: 0.13 },
  { left: 30, top: 92, size: 9, thickness: 5, duration: 29, delay: -8, opacity: 0.11 },
  { left: 94, top: 40, size: 6, thickness: 3, duration: 31, delay: -19, opacity: 0.12 },
];

export function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* A wash of colour so the page is never flat white, kept far lighter
          than any card that sits on top of it. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 12% 8%, rgb(53 89 240 / 0.09), transparent 60%)," +
            "radial-gradient(52rem 34rem at 88% 26%, rgb(255 87 16 / 0.075), transparent 62%)," +
            "radial-gradient(46rem 32rem at 50% 96%, rgb(18 183 106 / 0.07), transparent 64%)",
        }}
      />

      {/* A dot grid, replacing the ruled lines the old identity used. Faded
          out towards the bottom so it never competes with a footer or a dense
          list. */}
      <div
        className="absolute inset-0 opacity-[0.75]"
        style={{
          backgroundImage: "radial-gradient(rgb(13 17 23 / 0.07) 1px, transparent 1px)",
          backgroundSize: "2.25rem 2.25rem",
          maskImage: "linear-gradient(to bottom, #000, #000 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, #000, #000 70%, transparent)",
        }}
      />

      {RINGS.map((ring, i) => (
        <span
          key={i}
          className="drift absolute rounded-full border-current text-ink"
          style={{
            left: `${ring.left}%`,
            top: `${ring.top}%`,
            width: ring.size,
            height: ring.size,
            borderWidth: ring.thickness,
            opacity: ring.opacity,
            animationDuration: `${ring.duration}s`,
            animationDelay: `${ring.delay}s`,
            // Circles have no orientation, so the drift keyframe's rotation
            // would be invisible work. Held at zero.
            ["--drift-rotate" as string]: "0deg",
          }}
        >
          {ring.inner && (
            <span
              className="absolute rounded-full border border-current"
              style={{ inset: `${Math.round(ring.size * 0.22)}px` }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
