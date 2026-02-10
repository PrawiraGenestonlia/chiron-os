"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Agent, AgentStatus, Task, Escalation, Message, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { AgentActivityCard, useStreamBuffers } from "./agent-activity-card";
import { AlertSection } from "./alert-section";
import { ActivityTimeline } from "./activity-timeline";
import { toast } from "@/components/ui/toast";
import { getIdleBadgeConfig } from "@/lib/status-labels";

interface MessageWithChannel extends Message {
  channelName: string;
}

interface TimelineEvent {
  id: string;
  type: "message" | "task" | "escalation" | "status";
  text: string;
  timestamp: string;
  color: string;
  icon: string;
}

interface TeamOverviewProps {
  teamId: string;
  teamName: string;
  teamGoal: string | null;
  teamStatus: string;
  initialAgents: (Agent & { personaShortCode?: string })[];
  initialTasks: Task[];
  initialEscalations: Escalation[];
  initialCost: number;
  initialMessages: MessageWithChannel[];
  initialStartedAt?: string | null;
  initialMaxRuntimeMinutes?: number | null;
}

type IdleStatus = "active" | "backed_off" | "hibernating" | null;

export function TeamOverview({
  teamId,
  teamName,
  teamGoal,
  teamStatus: initialTeamStatus,
  initialAgents,
  initialTasks,
  initialEscalations,
  initialCost,
  initialMessages,
  initialStartedAt,
  initialMaxRuntimeMinutes,
}: TeamOverviewProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [tasks, setTasks] = useState(initialTasks);
  const [escalations, setEscalations] = useState(initialEscalations);
  const [cost, setCost] = useState(initialCost);
  const [messages, setMessages] = useState<MessageWithChannel[]>(initialMessages);
  const [, setTick] = useState(0);
  const [idleStatus, setIdleStatus] = useState<IdleStatus>(null);
  const [teamStatus, setTeamStatus] = useState(initialTeamStatus);
  const [toggling, setToggling] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt ?? null);
  const [maxRuntimeMinutes, setMaxRuntimeMinutes] = useState<number | null>(initialMaxRuntimeMinutes ?? null);
  const [taskEvents, setTaskEvents] = useState<TimelineEvent[]>([]);
  const [escalationEvents, setEscalationEvents] = useState<TimelineEvent[]>([]);

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
          setTaskEvents((prev) => [
            ...prev,
            {
              id: `te-${event.data.id}`,
              type: "task" as const,
              text: `Task "${event.data.title}" created`,
              timestamp: event.data.createdAt,
              color: "#3b82f6",
              icon: "T",
            },
          ].slice(-20));
          break;
        case "task:updated":
          setTasks((prev) =>
            prev.map((t) => (t.id === event.data.id ? event.data : t))
          );
          setTaskEvents((prev) => [
            ...prev,
            {
              id: `tu-${event.data.id}-${Date.now()}`,
              type: "task" as const,
              text: `Task "${event.data.title}" → ${event.data.status}`,
              timestamp: event.data.updatedAt ?? new Date().toISOString(),
              color: event.data.status === "done" ? "#22c55e" : "#3b82f6",
              icon: "T",
            },
          ].slice(-20));
          break;
        case "escalation:new":
          setEscalations((prev) => {
            if (prev.some((e) => e.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
          setEscalationEvents((prev) => [
            ...prev,
            {
              id: `en-${event.data.id}`,
              type: "escalation" as const,
              text: `Escalation: ${event.data.reason}`,
              timestamp: event.data.createdAt,
              color: "#ef4444",
              icon: "!",
            },
          ].slice(-20));
          break;
        case "escalation:resolved":
          setEscalations((prev) =>
            prev.map((e) => (e.id === event.data.id ? { ...e, status: "resolved" as const } : e))
          );
          break;
        case "usage:update":
          setCost((prev) => prev + event.data.costUsd);
          break;
        case "message:new": {
          const msg = event.data as MessageWithChannel;
          setMessages((prev) => [...prev, msg].slice(-20));
          break;
        }
        case "team:status":
          setTeamStatus(event.data.status);
          if (event.data.startedAt) setStartedAt(event.data.startedAt);
          if (event.data.maxRuntimeMinutes !== undefined) setMaxRuntimeMinutes(event.data.maxRuntimeMinutes);
          if (event.data.status === "stopped") {
            setStartedAt(null);
            setMaxRuntimeMinutes(null);
          }
          break;
        case "idle:nudge":
          setIdleStatus(event.data.status);
          break;
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
  const openEscalations = escalations.filter((e) => e.status === "open").length;
  const isRunning = teamStatus === "running";

  async function handleToggle() {
    setToggling(true);
    try {
      const endpoint = isRunning ? "stop" : "start";
      const res = await fetch(`/api/teams/${teamId}/${endpoint}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTeamStatus(isRunning ? "stopped" : "running");
        if (!isRunning && data.startedAt) {
          setStartedAt(data.startedAt);
          setMaxRuntimeMinutes(data.maxRuntimeMinutes ?? null);
        }
        if (isRunning) {
          setStartedAt(null);
          setMaxRuntimeMinutes(null);
        }
        toast(isRunning ? "Team stopped" : "Team started", "success");
      } else {
        toast(`Failed to ${endpoint} team`, "error");
      }
    } catch {
      toast("Request failed", "error");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header with inline start/stop */}
      <div className="flex items-start justify-between gap-4">
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
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: isRunning ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
            color: isRunning ? "#ef4444" : "#22c55e",
          }}
        >
          {toggling ? "..." : isRunning ? "Stop" : "Start"}
        </button>
      </div>

      {/* Compact metrics bar */}
      <div
        className="flex items-center gap-4 flex-wrap px-4 py-3 rounded-lg border text-sm"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <MetricInline label="Tasks" value={`${doneTasks}/${tasks.length}`} color="#3b82f6" />
        <Separator />
        <MetricInline label="Agents" value={`${runningAgents}/${agents.length}`} color="#22c55e" />
        <Separator />
        <MetricInline
          label="Escalations"
          value={String(openEscalations)}
          color={openEscalations > 0 ? "#ef4444" : "#6b7280"}
          alert={openEscalations > 0}
        />
        <Separator />
        <MetricInline label="Cost" value={cost > 0 ? `$${cost.toFixed(2)}` : "--"} color="#8b5cf6" />
        {isRunning && startedAt && (
          <>
            <Separator />
            <RuntimeTimer startedAt={startedAt} maxRuntimeMinutes={maxRuntimeMinutes} />
          </>
        )}
      </div>

      {/* Alerts */}
      <AlertSection teamId={teamId} escalations={escalations} tasks={tasks} />

      {/* Idle monitor status */}
      {idleStatus && <IdleStatusBadge status={idleStatus} />}

      {/* Agent activity — compact mode */}
      {agents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
            Agent Activity
          </h2>
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentActivityCard
                key={agent.id}
                agentId={agent.id}
                agentName={agent.name}
                personaShortCode={agent.personaShortCode}
                status={agent.status as AgentStatus}
                streamBuffer={buffers[agent.id] ?? ""}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
          Recent Activity
        </h2>
        <ActivityTimeline
          messages={messages}
          taskEvents={taskEvents}
          escalationEvents={escalationEvents}
        />
      </div>
    </div>
  );
}

function MetricInline({
  label,
  value,
  color,
  alert,
}: {
  label: string;
  value: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: color,
          animation: alert ? "pulse-glow 2s infinite" : undefined,
        }}
      />
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span
      className="w-px h-4 shrink-0"
      style={{ backgroundColor: "var(--border)" }}
    />
  );
}

function RuntimeTimer({ startedAt, maxRuntimeMinutes }: { startedAt: string; maxRuntimeMinutes: number | null }) {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startMs = new Date(startedAt).getTime();
  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));

  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const elapsed = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;

  let remaining: string | null = null;
  let urgency: "normal" | "warning" | "critical" = "normal";
  if (maxRuntimeMinutes && maxRuntimeMinutes > 0) {
    const totalSec = maxRuntimeMinutes * 60;
    const leftSec = Math.max(0, totalSec - elapsedSec);
    const lh = Math.floor(leftSec / 3600);
    const lm = Math.floor((leftSec % 3600) / 60);
    const ls = leftSec % 60;
    remaining = lh > 0
      ? `${lh}:${String(lm).padStart(2, "0")}:${String(ls).padStart(2, "0")}`
      : `${lm}:${String(ls).padStart(2, "0")}`;
    if (leftSec <= 300) urgency = "critical";
    else if (leftSec <= 900) urgency = "warning";
  }

  const dotColor = urgency === "critical" ? "#ef4444" : urgency === "warning" ? "#f59e0b" : "#22c55e";

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: dotColor,
          animation: urgency === "critical" ? "pulse-glow 1s infinite" : undefined,
        }}
      />
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Runtime</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
        {elapsed}
      </span>
      {remaining && (
        <span
          className="text-xs tabular-nums"
          style={{ color: urgency === "critical" ? "#ef4444" : urgency === "warning" ? "#f59e0b" : "var(--muted-foreground)" }}
        >
          ({remaining} left)
        </span>
      )}
    </div>
  );
}

function IdleStatusBadge({ status }: { status: "active" | "backed_off" | "hibernating" }) {
  const config = getIdleBadgeConfig(status);

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </div>
  );
}
