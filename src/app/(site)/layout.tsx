import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/** Public marketplace chrome: header, main landmark, footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
