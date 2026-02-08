"use client";

import type { TaskStatus } from "@chiron-os/shared";

interface TaskProgressSummaryProps {
  tasks: { status: TaskStatus }[];
}

const STATUS_CONFIG: { key: TaskStatus; label: string; color: string }[] = [
  { key: "done", label: "Done", color: "#22c55e" },
  { key: "review", label: "Review", color: "#8b5cf6" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "todo", label: "To Do", color: "#eab308" },
  { key: "backlog", label: "Backlog", color: "#6b7280" },
  { key: "blocked", label: "Blocked", color: "#ef4444" },
];

export function TaskProgressSummary({ tasks }: TaskProgressSummaryProps) {
  const total = tasks.length;
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }

  const done = counts.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="text-center py-6" style={{ color: "var(--muted-foreground)" }}>
        <p className="text-xs">No tasks yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "var(--muted)" }}>
        {STATUS_CONFIG.map(({ key, color }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          const width = (count / total) * 100;
          return (
            <div
              key={key}
              style={{ width: `${width}%`, backgroundColor: color }}
              title={`${key}: ${count}`}
            />
          );
        })}
      </div>

      {/* Percentage */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
          {pct}%
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          complete ({done}/{total} tasks)
        </span>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {STATUS_CONFIG.map(({ key, label, color }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
              <span className="font-medium tabular-nums" style={{ color: "var(--foreground)" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
