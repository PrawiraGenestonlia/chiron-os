import { Skeleton } from "@/components/ui/skeleton";

export default function TeamOverviewLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agents section */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-5 w-20 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent messages section */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
