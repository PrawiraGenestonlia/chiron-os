"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

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

      {/* Team Controls */}
      <div
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="font-semibold mb-4" style={{ color: "var(--card-foreground)" }}>
          Team Controls
        </h2>
        <div className="flex gap-2">
          <ActionButton
            label="Start Team"
            color="#22c55e"
            onClick={async () => {
              await fetch(`/api/teams/${teamId}/start`, { method: "POST" });
            }}
          />
          <ActionButton
            label="Stop Team"
            color="#ef4444"
            onClick={async () => {
              await fetch(`/api/teams/${teamId}/stop`, { method: "POST" });
            }}
          />
        </div>
      </div>

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
          onClick={async () => {
            if (!confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
            try {
              await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
              window.location.href = "/";
            } catch (err) {
              console.error("Failed to delete team:", err);
            }
          }}
          className="text-xs px-3 py-1.5 rounded border transition-colors"
          style={{ borderColor: "#ef4444", color: "#ef4444" }}
        >
          Delete Team
        </button>
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

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await onClick();
        } finally {
          setLoading(false);
        }
      }}
      className="text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {loading ? "..." : label}
    </button>
  );
}
