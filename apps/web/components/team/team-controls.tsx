"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeamControlsProps {
  teamId: string;
  initialStatus: string;
}

export function TeamControls({ teamId, initialStatus }: TeamControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isRunning = status === "running";
  const isIdle = status === "idle" || status === "stopped";

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start team");
      }
      setStatus("running");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/stop`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to stop team");
      }
      setStatus("stopped");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={status} />
      {isIdle && (
        <button
          onClick={handleStart}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#22c55e", color: "#000" }}
        >
          {loading ? "Starting..." : "Start Team"}
        </button>
      )}
      {isRunning && (
        <button
          onClick={handleStop}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#ef4444", color: "#fff" }}
        >
          {loading ? "Stopping..." : "Stop Team"}
        </button>
      )}
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    idle: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280" },
    running: { bg: "rgba(34,197,94,0.15)", text: "#4ade80", dot: "#22c55e" },
    stopped: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280" },
    error: { bg: "rgba(239,68,68,0.15)", text: "#f87171", dot: "#ef4444" },
  };
  const c = colors[status] ?? colors.idle;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: c.dot,
          boxShadow: status === "running" ? `0 0 6px ${c.dot}` : "none",
        }}
      />
      {status}
    </span>
  );
}
