"use client";

import { useState, useCallback } from "react";
import type { Task, TaskStatus, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { TaskCard } from "./task-card";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "backlog", label: "Backlog", color: "#6b7280" },
  { status: "todo", label: "To Do", color: "#3b82f6" },
  { status: "in_progress", label: "In Progress", color: "#f97316" },
  { status: "review", label: "Review", color: "#a855f7" },
  { status: "done", label: "Done", color: "#22c55e" },
  { status: "blocked", label: "Blocked", color: "#ef4444" },
];

interface KanbanBoardProps {
  teamId: string;
  initialTasks: Task[];
}

export function KanbanBoard({ teamId, initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleWsMessage = useCallback((event: WSServerEvent) => {
    if (event.type === "task:created") {
      setTasks((prev) => {
        if (prev.some((t) => t.id === event.data.id)) return prev;
        return [...prev, event.data];
      });
    }
    if (event.type === "task:updated") {
      setTasks((prev) =>
        prev.map((t) => (t.id === event.data.id ? event.data : t))
      );
    }
  }, []);

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  const handleStatusChange = async (taskId: string, status: string) => {
    // Save previous state for rollback
    const previousTasks = tasks;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: status as TaskStatus } : t
      )
    );

    try {
      const res = await fetch(`/api/teams/${teamId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        console.error("Failed to update task:", res.status);
        setTasks(previousTasks);
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      setTasks(previousTasks);
    }
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`/api/teams/${teamId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), status: "todo" }),
      });
      if (res.ok) {
        const task = (await res.json()) as Task;
        setTasks((prev) => {
          if (prev.some((t) => t.id === task.id)) return prev;
          return [...prev, task];
        });
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }

    setNewTitle("");
    setCreating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
          />
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {tasks.length} tasks
          </span>
        </div>

        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTask();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Task title"
              className="text-sm px-2 py-1 rounded border bg-transparent outline-none"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <button
              onClick={handleCreateTask}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="text-xs px-3 py-1 rounded transition-colors"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            + New Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-6 gap-3 min-h-[400px]">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  {col.label}
                </span>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {columnTasks.length}
                </span>
              </div>
              <div
                className="space-y-1.5 min-h-[200px] rounded-lg p-1.5"
                style={{ backgroundColor: "var(--card)" }}
              >
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
