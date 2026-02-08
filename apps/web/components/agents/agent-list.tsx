"use client";

import { useState, useCallback } from "react";
import type { Agent, AgentStatus, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { AgentCard } from "./agent-card";

interface AgentListProps {
  teamId: string;
  initialAgents: Agent[];
}

export function AgentList({ teamId, initialAgents }: AgentListProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);

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
  }, []);

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  const handleRestart = async (agentId: string) => {
    try {
      await fetch(`/api/teams/${teamId}/agents/${agentId}/restart`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to restart agent:", err);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
        />
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No agents in this team. Add agents from the team settings.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onRestart={handleRestart} />
          ))}
        </div>
      )}
    </div>
  );
}
