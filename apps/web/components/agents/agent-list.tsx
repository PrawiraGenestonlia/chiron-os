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

export function AgentList({ teamId, initialAgents }: AgentListProps) {
  const [agents, setAgents] = useState<EnrichedAgent[]>(initialAgents);
  const [streamTexts, setStreamTexts] = useState<Record<string, string>>({});
  const buffersRef = useRef<Record<string, string>>({});
  const frameRef = useRef<number | null>(null);

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
