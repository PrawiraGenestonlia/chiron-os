import type { AgentStatus } from "@chiron-os/shared";

/** Human-readable labels for agent statuses shown in the dashboard. */
export const HUMAN_STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  running: "Working",
  thinking: "Planning next step",
  tool_use: "Running code",
  paused: "Paused",
  stopped: "Stopped",
  error: "Error",
  restarting: "Restarting",
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "#6b7280",
  running: "#22c55e",
  thinking: "#3b82f6",
  tool_use: "#a855f7",
  paused: "#eab308",
  stopped: "#6b7280",
  error: "#ef4444",
  restarting: "#f97316",
};

/** Human-readable idle monitor labels. */
export const IDLE_LABELS: Record<string, string> = {
  active: "Monitoring",
  backed_off: "Pausing checks",
  hibernating: "Sleeping",
};

export function getIdleBadgeConfig(status: "active" | "backed_off" | "hibernating") {
  return {
    active: { label: IDLE_LABELS.active, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    backed_off: { label: IDLE_LABELS.backed_off, color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    hibernating: { label: IDLE_LABELS.hibernating, color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  }[status];
}
