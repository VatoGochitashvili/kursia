import { CircleTopBar } from "@/components/circle/CircleTopBar";

/**
 * Chrome for the inside of a circle: a thin top bar, and nothing else.
 *
 * No marketplace header and no footer. Once someone is in a circle, the circle
 * is the whole screen — that is what makes it feel like a place you belong to
 * rather than one more page of a website.
 */
export default function CircleGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <CircleTopBar />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
