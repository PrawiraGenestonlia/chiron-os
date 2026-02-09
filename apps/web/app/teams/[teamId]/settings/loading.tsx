import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-24 mb-5" />

      <div className="space-y-6 max-w-2xl">
        {/* Name field */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        {/* Goal field */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>

        {/* Workspace path */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
