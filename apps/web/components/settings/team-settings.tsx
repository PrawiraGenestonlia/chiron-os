"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Learning {
  id: string;
  teamId: string;
  agentId: string | null;
  category: string;
  content: string;
  createdAt: string;
}

interface TeamSettingsProps {
  teamId: string;
  initialName: string;
  initialGoal: string;
  initialWorkspacePath: string;
}

export function TeamSettings({ teamId, initialName, initialGoal, initialWorkspacePath }: TeamSettingsProps) {
  const [name, setName] = useState(initialName);
  const [goal, setGoal] = useState(initialGoal);
  const [workspacePath, setWorkspacePath] = useState(initialWorkspacePath);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal: goal || null, workspacePath: workspacePath || null }),
      });

      if (res.ok) {
        setSaved(true);
        toast("Settings saved", "success");
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast("Failed to save settings", "error");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast("Failed to save settings", "error");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Team Details */}
      <div
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="font-semibold mb-4" style={{ color: "var(--card-foreground)" }}>
          Team Details
        </h2>
        <div className="space-y-4">
          <FieldGroup label="Team Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none focus:border-blue-500"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </FieldGroup>

          <FieldGroup label="Goal">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="What should this team accomplish?"
              className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none resize-none focus:border-blue-500"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </FieldGroup>

          <FieldGroup label="Workspace Path">
            <input
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              placeholder="/path/to/project"
              className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none font-mono focus:border-blue-500"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              The project directory agents will work in. Used for git worktrees.
            </p>
          </FieldGroup>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-xs" style={{ color: "#22c55e" }}>
              Settings saved
            </span>
          )}
        </div>
      </div>

      {/* Team Learnings */}
      <LearningsSection teamId={teamId} />

      {/* Danger Zone */}
      <div
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--card)", borderColor: "#ef444440" }}
      >
        <h2 className="font-semibold mb-2" style={{ color: "#ef4444" }}>
          Danger Zone
        </h2>
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          Destructive actions that cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs px-3 py-1.5 rounded border transition-colors"
          style={{ borderColor: "#ef4444", color: "#ef4444" }}
        >
          Delete Team
        </button>
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Team"
          description="Are you sure you want to delete this team? This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
              window.location.href = "/";
            } catch (err) {
              console.error("Failed to delete team:", err);
              toast("Failed to delete team", "error");
              setDeleting(false);
              setShowDeleteConfirm(false);
            }
          }}
        />
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function LearningsSection({ teamId }: { teamId: string }) {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLearnings = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/learnings`);
      if (res.ok) {
        const data = await res.json();
        setLearnings(data);
      }
    } catch (err) {
      console.error("Failed to fetch learnings:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLearnings();
  }, [fetchLearnings]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/learnings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLearnings((prev) => prev.filter((l) => l.id !== id));
        toast("Learning deleted", "success");
      } else {
        toast("Failed to delete", "error");
      }
    } catch (err) {
      console.error("Failed to delete learning:", err);
      toast("Failed to delete", "error");
    }
  };

  return (
    <div
      className="rounded-lg border p-5"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <h2 className="font-semibold mb-4" style={{ color: "var(--card-foreground)" }}>
        Team Learnings
      </h2>
      <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
        Insights and decisions saved by agents during work. These are injected into agent system prompts.
      </p>
      {loading ? (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Loading...</p>
      ) : learnings.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          No learnings saved yet. Agents will save insights as they work.
        </p>
      ) : (
        <div className="space-y-2">
          {learnings.map((learning) => (
            <div
              key={learning.id}
              className="flex items-start justify-between gap-3 p-3 rounded border"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1"
                  style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
                >
                  {learning.category}
                </span>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>
                  {learning.content}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(learning.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(learning.id)}
                className="text-xs px-2 py-1 rounded border transition-colors hover:bg-red-500/10 shrink-0"
                style={{ borderColor: "#ef444440", color: "#ef4444" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

