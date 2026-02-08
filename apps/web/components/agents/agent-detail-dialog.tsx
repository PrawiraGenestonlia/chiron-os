"use client";

import type { Agent, AgentStatus } from "@chiron-os/shared";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HUMAN_STATUS_LABELS, STATUS_COLORS } from "@/lib/status-labels";
import { useRef, useEffect, useState } from "react";

type EnrichedAgent = Agent & { personaName?: string; personaShortCode?: string; personaColor?: string };

interface AgentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: EnrichedAgent;
  streamText?: string;
  onRestart?: (agentId: string) => void;
  onRemove?: (agentId: string) => void;
  teamStopped?: boolean;
}

export function AgentDetailDialog({
  open,
  onOpenChange,
  agent,
  streamText,
  onRestart,
  onRemove,
  teamStopped,
}: AgentDetailDialogProps) {
  const status = agent.status as AgentStatus;
  const color = STATUS_COLORS[status] ?? "#6b7280";
  const isActive = status === "running" || status === "thinking" || status === "tool_use";
  const preRef = useRef<HTMLPreElement>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [streamText]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
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
            <DialogTitle>{agent.name}</DialogTitle>
            <div className="flex items-center gap-1.5 ml-auto">
              <span
                className="w-2 h-2 rounded-full"
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
        </DialogHeader>

        <div className="space-y-3">
          {/* Details */}
          <div className="space-y-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {agent.personaName && (
              <div className="flex justify-between">
                <span>Role</span>
                <span>{agent.personaName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>ID</span>
              <span className="font-mono">{agent.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Model</span>
              <span className="font-mono">{agent.modelOverride ?? "default"}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span>{new Date(agent.createdAt).toLocaleString()}</span>
            </div>
            {agent.sessionId && (
              <div className="flex justify-between">
                <span>Session</span>
                <span className="font-mono">{agent.sessionId.slice(0, 12)}</span>
              </div>
            )}
          </div>

          {/* Stream output */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
              Output
            </p>
            <pre
              ref={preRef}
              className="text-[11px] leading-relaxed overflow-auto whitespace-pre-wrap break-words rounded p-2"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--muted-foreground)",
                maxHeight: 300,
                minHeight: 100,
              }}
            >
              {streamText || (
                <span style={{ opacity: 0.5 }}>
                  {isActive ? "Waiting for output..." : "Agent not active"}
                </span>
              )}
            </pre>
          </div>
        </div>

        <DialogFooter>
          {onRemove && (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              disabled={!teamStopped}
              className="text-sm px-3 py-2 rounded transition-colors disabled:opacity-40"
              style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}
              title={teamStopped ? undefined : "Stop the team to remove agents"}
            >
              Remove
            </button>
          )}
          <div className="flex-1" />
          {onRestart && (
            <button
              onClick={() => onRestart(agent.id)}
              disabled={status === "restarting"}
              className="text-sm px-3 py-2 rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              Restart
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm px-4 py-2 rounded transition-colors"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Close
          </button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove Agent"
        description={`Remove "${agent.name}" from this team? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setShowRemoveConfirm(false);
          onRemove?.(agent.id);
          onOpenChange(false);
        }}
      />
    </>
  );
}
