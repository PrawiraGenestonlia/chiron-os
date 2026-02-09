"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { LogEntry, LogLevel, Agent, WSServerEvent } from "@chiron-os/shared";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "#6b7280",
  info: "#3b82f6",
  warn: "#f59e0b",
  error: "#ef4444",
};

const LEVEL_OPTIONS: LogLevel[] = ["debug", "info", "warn", "error"];

interface LogViewerProps {
  teamId: string;
  initialLogs: LogEntry[];
  agents: Agent[];
}

export function LogViewer({ teamId, initialLogs, agents }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [levelFilter, setLevelFilter] = useState<LogLevel | "">("");
  const [agentFilter, setAgentFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const handleWsMessage = useCallback((event: WSServerEvent) => {
    if (event.type === "log:new") {
      setLogs((prev) => {
        const next = [...prev, event.data];
        if (next.length > 500) next.shift();
        return next;
      });
    }
  }, []);

  useWebSocket({ teamId, onMessage: handleWsMessage });

  useEffect(() => {
    if (autoScrollRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  const filtered = logs.filter((log) => {
    if (levelFilter && log.level !== levelFilter) return false;
    if (agentFilter && log.agentId !== agentFilter) return false;
    if (eventFilter && log.event !== eventFilter) return false;
    return true;
  });

  // Collect unique events from current logs
  const uniqueEvents = [...new Set(logs.map((l) => l.event))].sort();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Filters */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | "")}
          className="text-xs px-2 py-1.5 rounded border"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All Levels</option>
          {LEVEL_OPTIONS.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>

        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="text-xs px-2 py-1.5 rounded border"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="text-xs px-2 py-1.5 rounded border"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All Events</option>
          {uniqueEvents.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <span className="text-xs self-center" style={{ color: "var(--muted-foreground)" }}>
          {filtered.length} logs
        </span>
      </div>

      {/* Log feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded border font-mono text-xs"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {filtered.length === 0 ? (
          <div
            className="p-4 text-center"
            style={{ color: "var(--muted-foreground)" }}
          >
            No logs yet. Start a team to see activity.
          </div>
        ) : (
          <div className="p-2 space-y-px">
            {filtered.map((log) => {
              const agent = agents.find((a) => a.id === log.agentId);
              const time = log.createdAt.split("T")[1]?.slice(0, 8) ?? "";
              const dataStr = log.data ? JSON.stringify(log.data) : "";
              return (
                <div key={log.id} className="flex gap-2 py-0.5 px-1 rounded hover:bg-white/5">
                  <span style={{ color: "var(--muted-foreground)" }}>{time}</span>
                  <span
                    className="uppercase font-medium min-w-[40px]"
                    style={{ color: LEVEL_COLORS[log.level] }}
                  >
                    {log.level}
                  </span>
                  <span style={{ color: "#a78bfa" }}>{log.event}</span>
                  {agent && (
                    <span style={{ color: "#6ee7b7" }}>[{agent.name}]</span>
                  )}
                  {log.latencyMs !== null && (
                    <span style={{ color: "var(--muted-foreground)" }}>{log.latencyMs}ms</span>
                  )}
                  {dataStr && (
                    <span
                      className="truncate"
                      style={{ color: "var(--muted-foreground)" }}
                      title={dataStr}
                    >
                      {dataStr.slice(0, 120)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
