import { Card } from "@/components/ui/primitives";

/**
 * Dashboard loading state.
 *
 * Every dashboard route is force-dynamic and queries on render, so without
 * this the browser sits on the previous screen with nothing to look at. The
 * skeleton mirrors the real layout — a header, a stat row, a list — so the
 * page does not visibly re-flow when the content lands.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="skeleton h-7 w-52 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-72 rounded" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="skeleton mt-3.5 h-6 w-20 rounded" />
            <div className="skeleton mt-2 h-3 w-24 rounded" />
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="skeleton aspect-video w-full shrink-0 sm:aspect-[16/10] sm:w-48" />
              <div className="flex-1 p-4">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton mt-2 h-3 w-1/2 rounded" />
                <div className="mt-4 flex gap-4">
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="skeleton h-9 w-24 rounded-lg" />
                  <div className="skeleton h-9 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
