"use client";

import { useState, useCallback, useMemo } from "react";
import type { Task, TaskStatus, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { TaskCard } from "./task-card";
import { TaskDetailDialog } from "./task-detail-dialog";
import { SearchInput } from "@/components/ui/search-input";

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
  agentMap?: Record<string, string>;
}

export function KanbanBoard({ teamId, initialTasks, agentMap = {} }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const handleStatusChange = async (taskId: string, status: string) => {
    const previousTasks = tasks;
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

  const handleTaskUpdate = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
            />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {tasks.length} tasks
            </span>
          </div>
          <div className="max-w-[200px]">
            <SearchInput
              placeholder="Filter tasks..."
              value={search}
              onChange={setSearch}
            />
          </div>
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

      {tasks.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
        >
          <p className="text-sm">No tasks yet</p>
          <p className="text-xs mt-1">Start the team or create one manually.</p>
        </div>
      ) : (
        <div className="flex gap-3 min-h-[400px] overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="shrink-0 w-52">
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
                      onClick={() => setSelectedTask(task)}
                      agentName={task.assigneeId ? agentMap[task.assigneeId] : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(v) => { if (!v) setSelectedTask(null); }}
          task={selectedTask}
          teamId={teamId}
          agentMap={agentMap}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
