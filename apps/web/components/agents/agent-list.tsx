"use client";

import { useState, useCallback, useRef } from "react";
import type { Agent, AgentStatus, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { AgentCard } from "./agent-card";
import { AddAgentDialog } from "./add-agent-dialog";
import { AgentDetailDialog } from "./agent-detail-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { getIdleBadgeConfig } from "@/lib/status-labels";

type EnrichedAgent = Agent & { personaName?: string; personaShortCode?: string; personaColor?: string };

interface AgentListProps {
  teamId: string;
  teamStatus: string;
  initialAgents: EnrichedAgent[];
}

type IdleStatus = "active" | "backed_off" | "hibernating" | null;

export function AgentList({ teamId, teamStatus, initialAgents }: AgentListProps) {
  const [agents, setAgents] = useState<EnrichedAgent[]>(initialAgents);
  const [streamTexts, setStreamTexts] = useState<Record<string, string>>({});
  const buffersRef = useRef<Record<string, string>>({});
  const frameRef = useRef<number | null>(null);
  const [idleStatus, setIdleStatus] = useState<IdleStatus>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<EnrichedAgent | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(teamStatus);

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
    if (event.type === "team:status") {
      setCurrentStatus(event.data.status);
    }
  }, []);

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  const teamStopped = currentStatus !== "running";

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

  const handleRemove = async (agentId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/agents/${agentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
        toast("Agent removed", "success");
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to remove agent", "error");
      }
    } catch {
      toast("Failed to remove agent", "error");
    }
  };

  const refreshAgents = async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data as EnrichedAgent[]);
      }
    } catch {
      // silently fail
    }
  };

  const agentToRemove = agents.find((a) => a.id === removeTarget);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
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
        <button
          onClick={() => setShowAddDialog(true)}
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          + Add Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
        >
          <p className="text-sm">No agents yet</p>
          <p className="text-xs mt-1">Click &quot;Add Agent&quot; to assign roles to this team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onRestart={handleRestart}
              onRemove={(id) => setRemoveTarget(id)}
              onClick={() => setSelectedAgent(agent)}
              streamText={streamTexts[agent.id]}
              teamStopped={teamStopped}
            />
          ))}
        </div>
      )}

      <AddAgentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        teamId={teamId}
        onAgentAdded={refreshAgents}
      />

      {selectedAgent && (
        <AgentDetailDialog
          open={!!selectedAgent}
          onOpenChange={(v) => { if (!v) setSelectedAgent(null); }}
          agent={selectedAgent}
          streamText={streamTexts[selectedAgent.id]}
          onRestart={handleRestart}
          onRemove={(id) => { setSelectedAgent(null); setRemoveTarget(id); }}
          teamStopped={teamStopped}
        />
      )}

      {agentToRemove && (
        <ConfirmDialog
          open={!!removeTarget}
          onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}
          title="Remove Agent"
          description={`Remove "${agentToRemove.name}" from this team? This cannot be undone.`}
          confirmLabel="Remove"
          variant="danger"
          onConfirm={() => {
            handleRemove(removeTarget!);
            setRemoveTarget(null);
          }}
        />
      )}
    </div>
  );
}

function IdleStatusBadge({ status }: { status: "active" | "backed_off" | "hibernating" }) {
  const config = getIdleBadgeConfig(status);

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
