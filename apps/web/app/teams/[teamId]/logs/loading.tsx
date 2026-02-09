import { Skeleton } from "@/components/ui/skeleton";

export default function LogsLoading() {
  return (
    <div className="p-6 h-full flex flex-col">
      <Skeleton className="h-6 w-16 mb-5" />

      <div
        className="flex-1 rounded-lg border p-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Filter bar */}
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* Log entries */}
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-1">
              <Skeleton className="h-4 w-16 shrink-0" />
              <Skeleton className="h-4 w-12 shrink-0 rounded" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
