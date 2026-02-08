"use client";

import { useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "@chiron-os/shared";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#f97316",
  critical: "#ef4444",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "L",
  medium: "M",
  high: "H",
  critical: "!",
};

/** Maps current status to the next logical transition label + target status. */
const NEXT_ACTION: Record<string, { label: string; target: TaskStatus }[]> = {
  backlog: [{ label: "To Do", target: "todo" }],
  todo: [{ label: "Start", target: "in_progress" }],
  in_progress: [
    { label: "Review", target: "review" },
    { label: "Done", target: "done" },
  ],
  review: [{ label: "Done", target: "done" }],
  done: [],
  blocked: [{ label: "Unblock", target: "todo" }],
};

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: string) => void;
  onClick?: () => void;
  agentName?: string;
}

export function TaskCard({ task, onStatusChange, onClick, agentName }: TaskCardProps) {
  const [showMore, setShowMore] = useState(false);
  const priority = task.priority as TaskPriority;
  const priorityColor = PRIORITY_COLORS[priority] ?? "#6b7280";
  const actions = NEXT_ACTION[task.status] ?? [];

  const firstLine = task.description
    ? task.description.split("\n")[0]
    : null;

  return (
    <div
      className="rounded border px-2.5 py-2 text-sm group"
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      {/* Row 1: priority badge + title */}
      <div className="flex items-start gap-1.5">
        <span
          className="shrink-0 mt-0.5 text-[10px] font-bold leading-none w-4 h-4 rounded flex items-center justify-center"
          style={{
            color: priorityColor,
            backgroundColor: `${priorityColor}18`,
          }}
        >
          {PRIORITY_LABELS[priority] ?? "?"}
        </span>
        <h4
          className="font-medium leading-snug text-xs line-clamp-2 min-w-0"
          style={{ color: "var(--foreground)" }}
        >
          {task.title}
        </h4>
      </div>

      {/* Row 2 (optional): single-line description */}
      {firstLine && (
        <p
          className="text-[11px] leading-tight mt-1 line-clamp-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          {firstLine}
        </p>
      )}

      {/* Row 3: assignee + actions */}
      <div className="flex items-center justify-between mt-1.5 gap-1">
        {/* Assignee or spacer */}
        <div className="min-w-0">
          {task.assigneeId && (
            <span
              className="text-[10px] truncate block max-w-[80px]"
              style={{ color: "var(--muted-foreground)" }}
              title={agentName ?? task.assigneeId}
            >
              {agentName ?? task.assigneeId.slice(0, 8)}
            </span>
          )}
        </div>

        {/* Quick status transition */}
        {onStatusChange && actions.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {actions.length === 1 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, actions[0].target);
                }}
                className="text-[10px] leading-none px-1.5 py-0.5 rounded transition-colors opacity-60 group-hover:opacity-100"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                {actions[0].label}
              </button>
            ) : (
              <>
                {/* Show primary action always, secondary on hover/tap */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, actions[0].target);
                  }}
                  className="text-[10px] leading-none px-1.5 py-0.5 rounded transition-colors opacity-60 group-hover:opacity-100"
                  style={{
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {actions[0].label}
                </button>
                {!showMore ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMore(true); }}
                    className="text-[10px] leading-none px-1 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-60"
                    style={{
                      color: "var(--muted-foreground)",
                    }}
                    title="More actions"
                  >
                    ...
                  </button>
                ) : (
                  actions.slice(1).map((a) => (
                    <button
                      key={a.target}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(task.id, a.target);
                      }}
                      className="text-[10px] leading-none px-1.5 py-0.5 rounded transition-colors"
                      style={{
                        backgroundColor: "var(--muted)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {a.label}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
