import { AmbientBackdrop } from "@/components/layout/AmbientBackdrop";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MyCirclesDock } from "@/components/circle/MyCirclesDock";

/** Public marketplace chrome: header, main landmark, footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Behind the marketplace only. A circle's own pages are a workspace,
          and a workspace should not have wallpaper. */}
      <AmbientBackdrop />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <MyCirclesDock />
    </div>
  );
}
