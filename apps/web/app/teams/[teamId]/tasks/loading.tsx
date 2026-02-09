import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-28 mb-5" />

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div
            key={col}
            className="w-64 shrink-0 rounded-lg border p-3"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-5 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-md border"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
                >
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3 mb-2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
