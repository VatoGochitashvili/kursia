import { cn } from "@/lib/cn";

/**
 * A row that scrolls its content sideways, forever.
 *
 * Deliberately a server component with a pure-CSS animation: the whole effect
 * is one `transform` on a track the compositor owns, so it costs nothing on
 * the main thread and ships no JavaScript. That matters on a small instance
 * where every kilobyte of hydration competes with the page itself.
 *
 * The children are rendered twice and the track is animated exactly one half
 * of its width — that is what makes the loop seamless rather than snapping
 * back at the end. The second copy is `aria-hidden` and removed from the tab
 * order, so a screen reader and a keyboard both see one set of links, not two.
 *
 * It pauses on hover, because a link that is moving is a link you cannot
 * click, and it stops entirely under prefers-reduced-motion (see globals.css)
 * where an endlessly moving band is exactly what that setting is asking to
 * avoid.
 */
export function Marquee({
  children,
  className,
  /** Seconds for one full pass. Longer is calmer. */
  duration = 46,
  reverse = false,
  /** Fade the leading and trailing edges into the background. */
  fade = true,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  reverse?: boolean;
  fade?: boolean;
}) {
  return (
    <div
      className={cn("marquee group relative w-full overflow-hidden", className)}
      style={
        fade
          ? {
              maskImage:
                "linear-gradient(to right, transparent, #000 6rem, #000 calc(100% - 6rem), transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, #000 6rem, #000 calc(100% - 6rem), transparent)",
            }
          : undefined
      }
    >
      <div
        className="marquee-track flex w-max shrink-0 items-center gap-3"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <div className="flex shrink-0 items-center gap-3 pe-3">{children}</div>
        <div className="flex shrink-0 items-center gap-3 pe-3" aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </div>
  );
}
