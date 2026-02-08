"use client";

import { useState, useEffect, useCallback } from "react";
import type { Escalation, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";

const STATUS_COLORS: Record<string, string> = {
  open: "#ef4444",
  in_review: "#f97316",
  resolved: "#22c55e",
  dismissed: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

interface EscalationListProps {
  teamId: string;
  initialEscalations: Escalation[];
}

export function EscalationList({ teamId, initialEscalations }: EscalationListProps) {
  const [escalations, setEscalations] = useState<Escalation[]>(initialEscalations);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [filter, setFilter] = useState<"all" | "open">("all");

  const handleWsMessage = useCallback((event: WSServerEvent) => {
    if (event.type === "escalation:new") {
      setEscalations((prev) => {
        if (prev.some((e) => e.id === event.data.id)) return prev;
        return [event.data, ...prev];
      });
    }
  }, []);

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  // Also listen for resolved events via a custom event type
  useEffect(() => {
    // Re-fetch when filter changes
    fetch(`/api/teams/${teamId}/escalations${filter === "open" ? "?open=true" : ""}`)
      .then((r) => r.json())
      .then((data) => setEscalations(data as Escalation[]))
      .catch(console.error);
  }, [teamId, filter]);

  const handleResolve = async (escalationId: string) => {
    if (!resolution.trim()) return;

    try {
      const res = await fetch(`/api/teams/${teamId}/escalations/${escalationId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: resolution.trim() }),
      });

      if (res.ok) {
        const updated = (await res.json()) as Escalation;
        setEscalations((prev) =>
          prev.map((e) => (e.id === escalationId ? updated : e))
        );
      }
    } catch (err) {
      console.error("Failed to resolve escalation:", err);
    }

    setResolving(null);
    setResolution("");
  };

  const filtered = filter === "open"
    ? escalations.filter((e) => e.status === "open")
    : escalations;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
          />
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {filtered.length} escalation{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-1">
          {(["all", "open"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                backgroundColor: filter === f ? "var(--primary)" : "var(--muted)",
                color: filter === f ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              {f === "all" ? "All" : "Open"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
        >
          <p className="text-sm">No escalations {filter === "open" ? "open" : "yet"}</p>
          <p className="text-xs mt-1">
            Escalations appear when agents can&apos;t resolve an issue or votes deadlock
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((esc) => (
            <div
              key={esc.id}
              className="rounded-lg border p-4"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {esc.reason}
                  </p>
                  <p className="text-xs mt-1 font-mono" style={{ color: "var(--muted-foreground)" }}>
                    {esc.id.slice(0, 8)} &middot; {new Date(esc.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className="shrink-0 text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    color: STATUS_COLORS[esc.status] ?? "#6b7280",
                    backgroundColor: `${STATUS_COLORS[esc.status] ?? "#6b7280"}15`,
                  }}
                >
                  {STATUS_LABELS[esc.status] ?? esc.status}
                </span>
              </div>

              {esc.votes && Object.keys(esc.votes).length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                    Votes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(esc.votes).map(([agentId, choice]) => (
                      <span
                        key={agentId}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        {agentId.slice(0, 6)}: {String(choice)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {esc.resolution && (
                <div
                  className="text-xs p-2 rounded mt-2"
                  style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                >
                  <span className="font-semibold">Resolution:</span> {esc.resolution}
                </div>
              )}

              {esc.status === "open" && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  {resolving === esc.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleResolve(esc.id);
                          if (e.key === "Escape") {
                            setResolving(null);
                            setResolution("");
                          }
                        }}
                        placeholder="Resolution / decision / guidance..."
                        className="flex-1 text-sm px-2 py-1 rounded border bg-transparent outline-none"
                        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                      <button
                        onClick={() => handleResolve(esc.id)}
                        className="text-xs px-3 py-1 rounded"
                        style={{ backgroundColor: "#22c55e", color: "#fff" }}
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => {
                          setResolving(null);
                          setResolution("");
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolving(esc.id)}
                      className="text-xs px-3 py-1 rounded transition-colors"
                      style={{ backgroundColor: "#22c55e20", color: "#22c55e" }}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
