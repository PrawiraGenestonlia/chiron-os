"use client";

import { useRef, useEffect } from "react";
import type { Agent, AgentStatus } from "@chiron-os/shared";
import { HUMAN_STATUS_LABELS, STATUS_COLORS } from "@/lib/status-labels";

interface AgentCardProps {
  agent: Agent & { personaName?: string; personaShortCode?: string; personaColor?: string };
  onRestart?: (agentId: string) => void;
  onRemove?: (agentId: string) => void;
  onClick?: () => void;
  streamText?: string;
  teamStopped?: boolean;
}

export function AgentCard({ agent, onRestart, onRemove, onClick, streamText, teamStopped }: AgentCardProps) {
  const status = agent.status as AgentStatus;
  const color = STATUS_COLORS[status] ?? "#6b7280";
  const isActive = status === "running" || status === "thinking" || status === "tool_use";
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [streamText]);

  return (
    <div
      className="rounded-lg border p-4 transition-colors"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {agent.personaShortCode && (
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${agent.personaColor ?? "#6b7280"}20`,
                color: agent.personaColor ?? "#6b7280",
              }}
            >
              {agent.personaShortCode}
            </span>
          )}
          <h3 className="font-semibold" style={{ color: "var(--card-foreground)" }}>
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: isActive ? `0 0 6px ${color}` : "none",
            }}
          />
          <span className="text-xs" style={{ color }}>
            {HUMAN_STATUS_LABELS[status] ?? status}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {agent.personaName && (
          <div className="flex justify-between">
            <span>Role</span>
            <span>{agent.personaName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Model</span>
          <span className="font-mono">{agent.modelOverride ?? "default"}</span>
        </div>
      </div>

      {streamText && (
        <pre
          ref={preRef}
          className="mt-3 text-[11px] leading-relaxed overflow-auto whitespace-pre-wrap break-words rounded p-2"
          style={{
            backgroundColor: "var(--background)",
            color: "var(--muted-foreground)",
            maxHeight: 100,
          }}
        >
          {streamText}
        </pre>
      )}

      {(onRestart || onRemove) && (
        <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          {onRestart && (
            <button
              onClick={(e) => { e.stopPropagation(); onRestart(agent.id); }}
              disabled={status === "restarting"}
              className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              Restart
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(agent.id); }}
              disabled={!teamStopped}
              className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-40"
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "#f87171",
              }}
              title={teamStopped ? undefined : "Stop the team first"}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
