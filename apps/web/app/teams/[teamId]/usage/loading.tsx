import { Skeleton } from "@/components/ui/skeleton";

export default function UsageLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-32 mb-5" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Breakdown chart area */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-6 flex-1 rounded" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
