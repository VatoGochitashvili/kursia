import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * The page's living background.
 *
 * A flat white page reads as unfinished, but a decorated one very easily
 * reads as cluttered — so this is deliberately almost invisible: outlined
 * glyphs of the things this marketplace actually sells, at three to six
 * percent opacity, drifting slowly enough that you notice the movement only
 * if you look for it.
 *
 * Three properties matter more than the look:
 *
 *  • It is a server component with pure-CSS animation. No JavaScript ships
 *    for it, and every animated property is transform/opacity, which the
 *    compositor owns — this must not compete with the page on a 0.1-CPU
 *    instance.
 *  • Every position, size, delay and duration is written down rather than
 *    generated. Math.random() here would place glyphs differently on the
 *    server and in the browser, and React would report a hydration mismatch
 *    on every single page load.
 *  • It is `fixed` and behind everything, so it never affects layout, never
 *    intercepts a click, and scrolls under the content rather than with it.
 *
 * Content sits on opaque cards and section backgrounds above it, so nothing
 * here can reduce the contrast of any text.
 */

interface Glyph {
  icon: IconName;
  /** Percentages of the viewport. */
  left: number;
  top: number;
  size: number;
  rotate: number;
  /** Seconds. Spread so the field never pulses in unison. */
  duration: number;
  delay: number;
  opacity: number;
}

/**
 * Chosen to describe the catalogue, not "education" in the abstract: the
 * study motifs the brief asked for sit alongside the wellness and creator
 * subjects that the marketplace is actually built around.
 */
const GLYPHS: Glyph[] = [
  { icon: "book", left: 4, top: 12, size: 74, rotate: -14, duration: 26, delay: 0, opacity: 0.05 },
  { icon: "edit", left: 88, top: 8, size: 60, rotate: 22, duration: 31, delay: -6, opacity: 0.045 },
  { icon: "dumbbell", left: 14, top: 62, size: 82, rotate: 9, duration: 34, delay: -12, opacity: 0.04 },
  { icon: "leaf", left: 78, top: 44, size: 66, rotate: -18, duration: 29, delay: -3, opacity: 0.05 },
  { icon: "camera", left: 46, top: 82, size: 58, rotate: 12, duration: 37, delay: -18, opacity: 0.04 },
  { icon: "music", left: 92, top: 74, size: 62, rotate: -8, duration: 28, delay: -9, opacity: 0.045 },
  { icon: "lotus", left: 26, top: 30, size: 54, rotate: 6, duration: 33, delay: -21, opacity: 0.04 },
  { icon: "palette", left: 62, top: 18, size: 56, rotate: -20, duration: 30, delay: -15, opacity: 0.04 },
  { icon: "mic", left: 8, top: 88, size: 52, rotate: 16, duration: 35, delay: -7, opacity: 0.045 },
  { icon: "trendingUp", left: 70, top: 92, size: 64, rotate: -6, duration: 27, delay: -24, opacity: 0.04 },
  { icon: "sparkles", left: 36, top: 6, size: 48, rotate: 18, duration: 32, delay: -11, opacity: 0.05 },
  { icon: "video", left: 56, top: 54, size: 50, rotate: -12, duration: 36, delay: -17, opacity: 0.035 },
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
            "radial-gradient(60rem 40rem at 12% 8%, rgb(53 89 240 / 0.05), transparent 60%)," +
            "radial-gradient(52rem 34rem at 88% 26%, rgb(255 87 16 / 0.04), transparent 62%)," +
            "radial-gradient(46rem 32rem at 50% 96%, rgb(18 183 106 / 0.04), transparent 64%)",
        }}
      />

      {/* Ruled paper, at the threshold of visibility. */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgb(13 17 23 / 0.028) 1px, transparent 1px)",
          backgroundSize: "100% 2.25rem",
          maskImage: "linear-gradient(to bottom, #000, #000 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, #000, #000 70%, transparent)",
        }}
      />

      {GLYPHS.map((glyph, i) => (
        <span
          key={i}
          className="drift absolute text-ink"
          style={{
            left: `${glyph.left}%`,
            top: `${glyph.top}%`,
            opacity: glyph.opacity,
            animationDuration: `${glyph.duration}s`,
            animationDelay: `${glyph.delay}s`,
            ["--drift-rotate" as string]: `${glyph.rotate}deg`,
          }}
        >
          <Icon name={glyph.icon} size={glyph.size} strokeWidth={1.25} />
        </span>
      ))}
    </div>
  );
}
