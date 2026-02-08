"use client";

import { useState, useCallback, useRef } from "react";
import type { Agent, AgentStatus, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { AgentCard } from "./agent-card";
import { toast } from "@/components/ui/toast";

type EnrichedAgent = Agent & { personaName?: string; personaShortCode?: string; personaColor?: string };

interface AgentListProps {
  teamId: string;
  initialAgents: EnrichedAgent[];
}

type IdleStatus = "active" | "backed_off" | "hibernating" | null;

export function AgentList({ teamId, initialAgents }: AgentListProps) {
  const [agents, setAgents] = useState<EnrichedAgent[]>(initialAgents);
  const [streamTexts, setStreamTexts] = useState<Record<string, string>>({});
  const buffersRef = useRef<Record<string, string>>({});
  const frameRef = useRef<number | null>(null);
  const [idleStatus, setIdleStatus] = useState<IdleStatus>(null);

  const handleWsMessage = useCallback((event: WSServerEvent) => {
    if (event.type === "agent:status") {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.data.agentId
            ? { ...a, status: event.data.status as AgentStatus }
            : a
        )
      );
    }
    if (event.type === "agent:stream") {
      const { agentId, chunk } = event.data;
      const current = buffersRef.current[agentId] ?? "";
      buffersRef.current[agentId] = (current + chunk).slice(-500);

      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(() => {
          setStreamTexts({ ...buffersRef.current });
          frameRef.current = null;
        });
      }
    }
    if (event.type === "idle:nudge") {
      setIdleStatus(event.data.status);
    }
  }, []);

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  const handleRestart = async (agentId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/agents/${agentId}/restart`, {
        method: "POST",
      });
      if (res.ok) {
        toast("Agent restarting", "info");
      } else {
        toast("Failed to restart agent", "error");
      }
    } catch (err) {
      console.error("Failed to restart agent:", err);
      toast("Failed to restart agent", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
          />
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {idleStatus && <IdleStatusBadge status={idleStatus} />}
      </div>

      {agents.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No agents in this team. Add agents from the team settings.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onRestart={handleRestart}
              streamText={streamTexts[agent.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IdleStatusBadge({ status }: { status: "active" | "backed_off" | "hibernating" }) {
  const config = {
    active: { label: "Idle: Active", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    backed_off: { label: "Idle: Backed Off", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    hibernating: { label: "Idle: Hibernating", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
