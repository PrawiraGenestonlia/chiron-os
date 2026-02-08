"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AgentStatus } from "@chiron-os/shared";
import { HUMAN_STATUS_LABELS, STATUS_COLORS } from "@/lib/status-labels";

interface AgentActivityCardProps {
  agentId: string;
  agentName: string;
  personaShortCode?: string;
  status: AgentStatus;
  streamBuffer: string;
  compact?: boolean;
}

export function AgentActivityCard({ agentName, personaShortCode, status, streamBuffer, compact }: AgentActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const color = STATUS_COLORS[status] ?? "#6b7280";
  const isActive = status === "running" || status === "thinking" || status === "tool_use";

  // Auto-scroll stream area
  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [streamBuffer]);

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors"
        style={{
          backgroundColor: "var(--card)",
          borderColor: isActive ? `${color}40` : "var(--border)",
        }}
      >
        {personaShortCode && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {personaShortCode}
          </span>
        )}
        <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
          {agentName}
        </span>
        <span className="text-xs ml-auto shrink-0 flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: isActive ? `0 0 6px ${color}` : "none",
            }}
          />
          <span style={{ color }}>{HUMAN_STATUS_LABELS[status] ?? status}</span>
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: "var(--card)",
        borderColor: isActive ? `${color}40` : "var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {personaShortCode && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              {personaShortCode}
            </span>
          )}
          <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
            {agentName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: isActive ? `0 0 6px ${color}` : "none",
              animation: status === "thinking" ? "pulse-glow 1.5s infinite" : "none",
            }}
          />
          <span className="text-[10px] font-mono" style={{ color }}>
            {HUMAN_STATUS_LABELS[status] ?? status}
          </span>
          {compact && (
            <button
              onClick={() => setExpanded(false)}
              className="text-[10px] ml-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Collapse
            </button>
          )}
        </div>
      </div>

      {/* Stream area */}
      <pre
        ref={preRef}
        className="text-[11px] leading-relaxed overflow-auto whitespace-pre-wrap break-words rounded p-2"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--muted-foreground)",
          maxHeight: 120,
          minHeight: 60,
        }}
      >
        {streamBuffer || (
          <span style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
            {isActive ? "Waiting for output..." : "Agent not active"}
          </span>
        )}
      </pre>

      {/* Status indicators */}
      {status === "thinking" && (
        <div className="flex items-center gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full"
              style={{
                backgroundColor: "#3b82f6",
                animation: `pulse-glow 1s infinite ${i * 0.2}s`,
              }}
            />
          ))}
          <span className="text-[10px] ml-1" style={{ color: "#60a5fa" }}>Thinking</span>
        </div>
      )}
      {status === "tool_use" && (
        <div className="mt-2 text-[10px]" style={{ color: "#c084fc" }}>
          Executing tool...
        </div>
      )}
    </div>
  );
}

// Ref-based stream accumulator to avoid re-renders on every chunk
export function useStreamBuffers() {
  const buffersRef = useRef<Record<string, string>>({});
  const renderRef = useRef<Record<string, string>>({});
  const frameRef = useRef<number | null>(null);
  const settersRef = useRef<(() => void) | null>(null);

  const appendChunk = useCallback((agentId: string, chunk: string) => {
    const current = buffersRef.current[agentId] ?? "";
    // Keep last ~500 chars
    const updated = (current + chunk).slice(-500);
    buffersRef.current[agentId] = updated;

    // Throttle renders via rAF
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        renderRef.current = { ...buffersRef.current };
        settersRef.current?.();
        frameRef.current = null;
      });
    }
  }, []);

  const getBuffers = useCallback(() => renderRef.current, []);

  const setTrigger = useCallback((fn: () => void) => {
    settersRef.current = fn;
  }, []);

  return { appendChunk, getBuffers, setTrigger };
}
