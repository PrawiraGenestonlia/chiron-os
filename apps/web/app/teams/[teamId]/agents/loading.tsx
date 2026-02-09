import { Skeleton } from "@/components/ui/skeleton";

export default function AgentsLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-20 mb-5" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-4/5" />
            <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
