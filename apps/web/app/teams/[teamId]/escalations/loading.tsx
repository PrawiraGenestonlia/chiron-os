import { Skeleton } from "@/components/ui/skeleton";

export default function EscalationsLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-28 mb-5" />

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-1" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md shrink-0 ml-4" />
            </div>
            <div className="flex gap-4 mt-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
