import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";

/**
 * Authenticated area (student dashboard, creator studio, admin).
 * Shares the marketplace header so navigation is continuous, but drops the
 * marketing footer — these are working screens, not landing pages.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
