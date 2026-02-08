"use client";

import type { Channel } from "@chiron-os/shared";

interface ChannelSidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (channelId: string) => void;
}

export function ChannelSidebar({ channels, activeChannelId, onSelect }: ChannelSidebarProps) {
  return (
    <div
      className="w-56 shrink-0 border-r overflow-y-auto"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <div className="p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
          Channels
        </h2>
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
