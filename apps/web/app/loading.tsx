import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Team cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-lg border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
