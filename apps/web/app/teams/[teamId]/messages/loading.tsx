import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 shrink-0">
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex-1 px-6 pb-6 min-h-0 flex gap-4">
        {/* Channel sidebar */}
        <div
          className="w-48 shrink-0 rounded-lg border p-3"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 space-y-4 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                </div>
              </div>
            ))}
          </div>
          {/* Input area */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
