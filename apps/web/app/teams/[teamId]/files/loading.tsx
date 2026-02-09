import { Skeleton } from "@/components/ui/skeleton";

export default function FilesLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* File tree */}
        <div
          className="w-64 shrink-0 rounded-lg border p-3"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2" style={{ paddingLeft: i % 3 !== 0 ? "16px" : "0" }}>
                <Skeleton className="w-4 h-4 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Content viewer */}
        <div
          className="flex-1 rounded-lg border p-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-2">
            {["w-full", "w-3/4", "w-5/6", "w-2/3", "w-full", "w-4/5", "w-1/2", "w-full", "w-3/4", "w-5/6", "w-2/3", "w-4/5"].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
