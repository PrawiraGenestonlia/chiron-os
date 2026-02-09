import { Skeleton } from "@/components/ui/skeleton";

export default function PersonasLoading() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-28 mb-1" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border flex items-start gap-4"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-10 rounded" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
