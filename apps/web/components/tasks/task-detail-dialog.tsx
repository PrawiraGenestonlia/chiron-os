"use client";

import { useState } from "react";
import type { Task, TaskStatus, TaskPriority } from "@chiron-os/shared";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  teamId: string;
  agentMap: Record<string, string>;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  teamId,
  agentMap,
  onUpdate,
  onDelete,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasChanges =
    title !== task.title ||
    description !== (task.description ?? "") ||
    status !== task.status ||
    priority !== task.priority ||
    assigneeId !== (task.assigneeId ?? "");

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          assigneeId: assigneeId || null,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Task;
        onUpdate(updated);
        toast("Task updated", "success");
        onOpenChange(false);
      } else {
        toast("Failed to update task", "error");
      }
    } catch {
      toast("Failed to update task", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(task.id);
        toast("Task deleted", "success");
        onOpenChange(false);
      } else {
        toast("Failed to delete task", "error");
      }
    } catch {
      toast("Failed to delete task", "error");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none focus:border-blue-500"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Task details..."
              className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none resize-none focus:border-blue-500"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">Unassigned</option>
              {Object.entries(agentMap).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm px-3 py-2 rounded transition-colors"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm px-4 py-2 rounded transition-colors"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || !title.trim()}
            className="text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Task"
        description={`Delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  );
}
