"use client";

import { useState, useCallback } from "react";
import type { Deployment, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";

const STATUS_COLORS: Record<string, string> = {
  queued: "#6b7280",
  building: "#3b82f6",
  ready: "#22c55e",
  error: "#ef4444",
  canceled: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  building: "Building",
  ready: "Ready",
  error: "Error",
  canceled: "Canceled",
};

const ENV_COLORS: Record<string, string> = {
  production: "#8b5cf6",
  preview: "#3b82f6",
  development: "#6b7280",
};

interface DeploymentListProps {
  teamId: string;
  initialDeployments: Deployment[];
  agentMap?: Record<string, string>;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function DeploymentList({
  teamId,
  initialDeployments,
  agentMap = {},
}: DeploymentListProps) {
  const [deployments, setDeployments] = useState<Deployment[]>(initialDeployments);

  const handleWsMessage = useCallback((event: WSServerEvent) => {
    if (event.type === "deployment:new") {
      setDeployments((prev) => {
        if (prev.some((d) => d.id === event.data.id)) return prev;
        return [event.data, ...prev];
      });
    }
    if (event.type === "deployment:updated") {
      setDeployments((prev) =>
        prev.map((d) => (d.id === event.data.id ? event.data : d))
      );
    }
  }, []);

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
        />
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {deployments.length} deployment{deployments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {deployments.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
        >
          <p className="text-sm">No deployments yet</p>
          <p className="text-xs mt-1">
            Deployments appear when agents deploy projects via Vercel or other providers
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deployments.map((dep) => (
            <div
              key={dep.id}
              className="rounded-lg border p-4"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {dep.projectName}
                    </p>
                    {/* Provider tag */}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                      {dep.provider}
                    </span>
                    {/* Environment tag */}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        color: ENV_COLORS[dep.environment] ?? "#6b7280",
                        backgroundColor: `${ENV_COLORS[dep.environment] ?? "#6b7280"}15`,
                      }}
                    >
                      {dep.environment}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {relativeTime(dep.createdAt)}
                    </span>
                    {dep.agentId && agentMap[dep.agentId] && (
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        &middot; {agentMap[dep.agentId]}
                      </span>
                    )}
                    {dep.commitSha && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        {dep.commitSha.slice(0, 7)}
                      </span>
                    )}
                  </div>
                  {dep.commitMessage && (
                    <p className="text-xs mt-1 truncate" style={{ color: "var(--muted-foreground)" }}>
                      {dep.commitMessage}
                    </p>
                  )}
                </div>
                {/* Status badge */}
                <span
                  className="shrink-0 text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    color: STATUS_COLORS[dep.status] ?? "#6b7280",
                    backgroundColor: `${STATUS_COLORS[dep.status] ?? "#6b7280"}15`,
                  }}
                >
                  {dep.status === "building" && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ backgroundColor: STATUS_COLORS.building }} />
                  )}
                  {STATUS_LABELS[dep.status] ?? dep.status}
                </span>
              </div>

              {/* URLs */}
              {(dep.deploymentUrl || dep.inspectUrl) && (
                <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  {dep.deploymentUrl && (
                    <a
                      href={dep.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline transition-colors"
                      style={{ color: "#3b82f6" }}
                    >
                      Visit
                    </a>
                  )}
                  {dep.inspectUrl && (
                    <a
                      href={dep.inspectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Inspect
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
