"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import type { WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { toast } from "@/components/ui/toast";

interface TeamSidebarProps {
  teamId: string;
  teamName: string;
  teamStatus: string;
  agentCount: number;
  taskCount: number;
  openEscalations: number;
}

export function TeamSidebar({
  teamId,
  teamName,
  teamStatus: initialStatus,
  agentCount: initialAgentCount,
  taskCount: initialTaskCount,
  openEscalations: initialEscalations,
}: TeamSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [agentCount, setAgentCount] = useState(initialAgentCount);
  const [taskCount, setTaskCount] = useState(initialTaskCount);
  const [openEscalations, setOpenEscalations] = useState(initialEscalations);

  const handleWsMessage = useCallback((event: WSServerEvent) => {
    if (event.type === "agent:status") {
      // Refresh agent count on status changes
      setAgentCount((prev) => prev); // keep same, real count from server
    }
    if (event.type === "task:created") {
      setTaskCount((prev) => prev + 1);
    }
    if (event.type === "escalation:new") {
      setOpenEscalations((prev) => prev + 1);
    }
    if (event.type === "escalation:resolved") {
      setOpenEscalations((prev) => Math.max(0, prev - 1));
    }
    if (event.type === "team:status") {
      setStatus(event.data.status);
    }
  }, []);

  useWebSocket({ teamId, onMessage: handleWsMessage });

  const isRunning = status === "running";
  const isIdle = status === "idle" || status === "stopped";

  async function handleToggle() {
    setLoading(true);
    try {
      const endpoint = isRunning ? "stop" : "start";
      const res = await fetch(`/api/teams/${teamId}/${endpoint}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to ${endpoint} team`);
      }
      const newStatus = isRunning ? "stopped" : "running";
      setStatus(newStatus);
      toast(
        isRunning ? "Team stopped" : "Team started",
        isRunning ? "info" : "success"
      );
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Operation failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const navItems = [
    { href: `/teams/${teamId}`, label: "Overview", icon: "grid", exact: true },
    { href: `/teams/${teamId}/messages`, label: "Messages", icon: "msg" },
    { href: `/teams/${teamId}/tasks`, label: "Tasks", icon: "task", badge: taskCount || undefined },
    { href: `/teams/${teamId}/agents`, label: "Agents", icon: "agent", badge: agentCount || undefined },
    { href: `/teams/${teamId}/escalations`, label: "Escalations", icon: "alert", badge: openEscalations || undefined, alert: openEscalations > 0 },
    { href: `/teams/${teamId}/usage`, label: "Usage", icon: "chart" },
    { href: `/teams/${teamId}/settings`, label: "Settings", icon: "gear" },
  ];

  return (
    <aside
      className="shrink-0 w-52 border-r flex flex-col overflow-y-auto"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Team name */}
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2
          className="text-sm font-bold truncate mb-1"
          style={{ color: "var(--foreground)" }}
          title={teamName}
        >
          {teamName}
        </h2>
        <Link
          href="/"
          className="text-xs transition-colors hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          &larr; All Teams
        </Link>
      </div>

      {/* Team controls */}
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isRunning ? "#22c55e" : "#6b7280",
              boxShadow: isRunning ? "0 0 6px #22c55e" : "none",
            }}
          />
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {status}
          </span>
        </div>
        {(isIdle || isRunning) && (
          <button
            onClick={handleToggle}
            disabled={loading}
            className="w-full text-xs py-1.5 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: isRunning ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
              color: isRunning ? "#f87171" : "#4ade80",
            }}
          >
            {loading ? "..." : isRunning ? "Stop Team" : "Start Team"}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-3 py-2 rounded text-xs transition-colors hover:bg-white/5"
              style={{
                backgroundColor: active ? "var(--muted)" : "transparent",
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              <span className="flex items-center gap-2">
                <NavIcon name={item.icon} />
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  className="min-w-[18px] text-center px-1 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: item.alert ? "rgba(239,68,68,0.2)" : "var(--muted)",
                    color: item.alert ? "#f87171" : "var(--muted-foreground)",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function NavIcon({ name }: { name: string }) {
  const s = { width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 1.5 };
  switch (name) {
    case "grid":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      );
    case "msg":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <path d="M3 3h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6l-3 3V4a1 1 0 0 1 1-1z" />
        </svg>
      );
    case "task":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M5 8l2 2 4-4" />
        </svg>
      );
    case "agent":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <circle cx="8" cy="6" r="3" />
          <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        </svg>
      );
    case "alert":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <path d="M8 2l6 11H2L8 2z" />
          <path d="M8 7v2" />
          <circle cx="8" cy="11" r="0.5" fill="currentColor" />
        </svg>
      );
    case "chart":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <path d="M2 14V8" />
          <path d="M6 14V5" />
          <path d="M10 14V7" />
          <path d="M14 14V3" />
        </svg>
      );
    case "gear":
      return (
        <svg {...s} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
        </svg>
      );
    default:
      return null;
  }
}
