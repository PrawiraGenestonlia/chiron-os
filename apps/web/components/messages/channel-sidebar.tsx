"use client";

import { useState } from "react";
import type { Channel, ChannelType } from "@chiron-os/shared";
import { toast } from "@/components/ui/toast";

interface ChannelSidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (channelId: string) => void;
  teamId: string;
  onChannelCreated?: () => void;
}

export function ChannelSidebar({ channels, activeChannelId, onSelect, teamId, onChannelCreated }: ChannelSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ChannelType>("general");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const name = newName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: newType }),
      });
      if (res.ok) {
        toast("Channel created", "success");
        setCreating(false);
        setNewName("");
        onChannelCreated?.();
      } else {
        toast("Failed to create channel", "error");
      }
    } catch {
      toast("Failed to create channel", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="w-56 shrink-0 border-r overflow-y-auto"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Channels
          </h2>
          <button
            onClick={() => setCreating(!creating)}
            className="text-xs leading-none px-1.5 py-0.5 rounded transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            title="New channel"
          >
            +
          </button>
        </div>

        {creating && (
          <div className="mb-2 space-y-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="channel-name"
              className="w-full text-xs px-2 py-1 rounded border bg-transparent outline-none"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ChannelType)}
              className="w-full text-xs px-2 py-1 rounded border bg-transparent outline-none"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="general">General</option>
              <option value="planning">Planning</option>
              <option value="design">Design</option>
              <option value="engineering">Engineering</option>
              <option value="escalations">Escalations</option>
              <option value="suggestions">Suggestions</option>
            </select>
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="text-xs px-2 py-1 rounded disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {saving ? "..." : "Create"}
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="text-xs px-2 py-1 rounded"
                style={{ color: "var(--muted-foreground)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className="w-full text-left px-2 py-1.5 rounded text-sm transition-colors"
              style={{
                backgroundColor: activeChannelId === ch.id ? "var(--accent)" : "transparent",
                color: activeChannelId === ch.id ? "var(--accent-foreground)" : "var(--muted-foreground)",
              }}
            >
              <span className="opacity-60">#</span> {ch.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
