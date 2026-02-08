"use client";

import { useState, useCallback, useEffect } from "react";
import type { Agent, AgentStatus, Task, TaskStatus, Message, Escalation, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { AgentActivityCard, useStreamBuffers } from "./agent-activity-card";
import { LiveMessageFeed } from "./live-message-feed";
import { TaskProgressSummary } from "./task-progress-summary";

interface MessageWithChannel extends Message {
  channelName: string;
}

interface TeamOverviewProps {
  teamId: string;
  teamName: string;
  teamGoal: string | null;
  initialAgents: (Agent & { personaShortCode?: string })[];
  initialTasks: Task[];
  initialEscalations: Escalation[];
  initialCost: number;
  initialMessages: MessageWithChannel[];
}

export function TeamOverview({
  teamId,
  teamName,
  teamGoal,
  initialAgents,
  initialTasks,
  initialEscalations,
  initialCost,
  initialMessages,
}: TeamOverviewProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [tasks, setTasks] = useState(initialTasks);
  const [openEscalations, setOpenEscalations] = useState(
    initialEscalations.filter((e) => e.status === "open").length
  );
  const [cost, setCost] = useState(initialCost);
  const [messages, setMessages] = useState<MessageWithChannel[]>(initialMessages);
  const [, setTick] = useState(0);

  const { appendChunk, getBuffers, setTrigger } = useStreamBuffers();

  useEffect(() => {
    setTrigger(() => setTick((t) => t + 1));
  }, [setTrigger]);

  const handleWsMessage = useCallback(
    (event: WSServerEvent) => {
      switch (event.type) {
        case "agent:status":
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.data.agentId
                ? { ...a, status: event.data.status as AgentStatus }
                : a
            )
          );
          break;
        case "agent:stream":
          appendChunk(event.data.agentId, event.data.chunk);
          break;
        case "task:created":
          setTasks((prev) => {
            if (prev.some((t) => t.id === event.data.id)) return prev;
            return [...prev, event.data];
          });
          break;
        case "task:updated":
          setTasks((prev) =>
            prev.map((t) => (t.id === event.data.id ? event.data : t))
          );
          break;
        case "escalation:new":
          setOpenEscalations((prev) => prev + 1);
          break;
        case "escalation:resolved":
          setOpenEscalations((prev) => Math.max(0, prev - 1));
          break;
        case "usage:update":
          setCost((prev) => prev + event.data.costUsd);
          break;
        case "message:new": {
          const msg = event.data as MessageWithChannel;
          setMessages((prev) => {
            const updated = [...prev, msg];
            return updated.slice(-10);
          });
          break;
        }
      }
    },
    [appendChunk]
  );

  useWebSocket({ teamId, onMessage: handleWsMessage });

  const buffers = getBuffers();
  const runningAgents = agents.filter(
    (a) => a.status === "running" || a.status === "thinking" || a.status === "tool_use"
  ).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          {teamName}
        </h1>
        {teamGoal && (
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {teamGoal}
          </p>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Tasks"
          value={`${doneTasks}/${tasks.length}`}
          sub="completed"
          color="#3b82f6"
        />
        <MetricCard
          label="Agents"
          value={`${runningAgents}/${agents.length}`}
          sub="active"
          color="#22c55e"
        />
        <MetricCard
          label="Escalations"
          value={String(openEscalations)}
          sub="open"
          color={openEscalations > 0 ? "#ef4444" : "#6b7280"}
          alert={openEscalations > 0}
        />
        <MetricCard
          label="Cost"
          value={cost > 0 ? `$${cost.toFixed(2)}` : "--"}
          sub="USD"
          color="#8b5cf6"
        />
      </div>

      {/* Escalation alert */}
      {openEscalations > 0 && (
        <div
          className="px-4 py-3 rounded-lg border text-sm flex items-center gap-2"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.3)",
            color: "#f87171",
            animation: "pulse-glow 2s infinite",
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          {openEscalations} escalation{openEscalations !== 1 ? "s" : ""} need human review
        </div>
      )}

      {/* Agent activity */}
      {agents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
            Agent Activity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <AgentActivityCard
                key={agent.id}
                agentId={agent.id}
                agentName={agent.name}
                personaShortCode={agent.personaShortCode}
                status={agent.status as AgentStatus}
                streamBuffer={buffers[agent.id] ?? ""}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Live message feed */}
        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
            Recent Messages
          </h2>
          <LiveMessageFeed messages={messages} />
        </div>

        {/* Task progress */}
        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
            Task Progress
          </h2>
          <TaskProgressSummary tasks={tasks.map((t) => ({ status: t.status as TaskStatus }))} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
  alert,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "var(--card)",
        borderColor: alert ? "rgba(239,68,68,0.4)" : "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </span>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
        {sub}
      </div>
    </div>
  );
}
