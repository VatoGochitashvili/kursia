import { AmbientBackdrop } from "@/components/layout/AmbientBackdrop";

/**
 * A page with one job and nothing around it.
 *
 * No header, no footer, no search, no floating circles button: somebody who
 * pressed "create your circle" is being shown one thing and asked one
 * question. The page fills the window exactly and does not scroll; the only
 * way out is the logo at the top, which goes home.
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <AmbientBackdrop />
      {children}
    </div>
  );
}
