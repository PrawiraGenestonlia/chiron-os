"use client";

import type { Agent, AgentStatus } from "@chiron-os/shared";

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "#6b7280",
  running: "#22c55e",
  thinking: "#3b82f6",
  tool_use: "#a855f7",
  paused: "#eab308",
  stopped: "#6b7280",
  error: "#ef4444",
  restarting: "#f97316",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  running: "Running",
  thinking: "Thinking",
  tool_use: "Using Tool",
  paused: "Paused",
  stopped: "Stopped",
  error: "Error",
  restarting: "Restarting",
};

interface AgentCardProps {
  agent: Agent;
  onRestart?: (agentId: string) => void;
}

export function AgentCard({ agent, onRestart }: AgentCardProps) {
  const status = agent.status as AgentStatus;
  const color = STATUS_COLORS[status] ?? "#6b7280";
  const isActive = status === "running" || status === "thinking" || status === "tool_use";

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: "var(--card-foreground)" }}>
          {agent.name}
        </h3>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: isActive ? `0 0 6px ${color}` : "none",
            }}
          />
          <span className="text-xs font-mono" style={{ color }}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <div className="flex justify-between">
          <span>ID</span>
          <span className="font-mono">{agent.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span>Model</span>
          <span className="font-mono">{agent.modelOverride ?? "default"}</span>
        </div>
      </div>

      {onRestart && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => onRestart(agent.id)}
            disabled={status === "restarting"}
            className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
