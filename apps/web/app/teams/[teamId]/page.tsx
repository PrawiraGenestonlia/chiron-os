import {
  getTeamById,
  getAgentsByTeam,
  getChannelsByTeam,
  getTasksByTeam,
  getEscalationsByTeam,
  getUsageByTeam,
} from "@chiron-os/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamControls } from "@/components/team/team-controls";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const agentStatusColor: Record<string, { bg: string; text: string; dot: string }> = {
  idle: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280" },
  running: { bg: "rgba(34,197,94,0.15)", text: "#4ade80", dot: "#22c55e" },
  thinking: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", dot: "#3b82f6" },
  tool_use: { bg: "rgba(168,85,247,0.15)", text: "#c084fc", dot: "#a855f7" },
  paused: { bg: "rgba(234,179,8,0.15)", text: "#facc15", dot: "#eab308" },
  stopped: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280" },
  error: { bg: "rgba(239,68,68,0.15)", text: "#f87171", dot: "#ef4444" },
  restarting: { bg: "rgba(234,179,8,0.15)", text: "#facc15", dot: "#eab308" },
};

export default async function TeamPage({ params }: PageProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();

  const agents = getAgentsByTeam(teamId);
  const channels = getChannelsByTeam(teamId);
  const allTasks = getTasksByTeam(teamId);
  const escalations = getEscalationsByTeam(teamId);
  const usage = getUsageByTeam(teamId);

  const doneTasks = allTasks.filter((t) => t.status === "done").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
  const blockedTasks = allTasks.filter((t) => t.status === "blocked").length;
  const openEscalations = escalations.filter((e) => e.status === "open").length;
  const runningAgents = agents.filter((a) => a.status === "running" || a.status === "thinking" || a.status === "tool_use").length;
  const totalCost = usage?.totalCostUsd ?? 0;
  const totalTokens = (usage?.totalInputTokens ?? 0) + (usage?.totalOutputTokens ?? 0);

  const metrics = [
    { label: "Tasks", value: allTasks.length, sub: `${doneTasks} done`, color: "#3b82f6" },
    { label: "In Progress", value: inProgressTasks, sub: blockedTasks > 0 ? `${blockedTasks} blocked` : "none blocked", color: "#eab308" },
    { label: "Channels", value: channels.length, sub: "active", color: "#8b5cf6" },
    { label: "Agents", value: agents.length, sub: `${runningAgents} active`, color: "#22c55e" },
  ];

  const navItems = [
    {
      href: `/teams/${teamId}/messages`,
      label: "Messages",
      desc: "Team communication channels",
      count: channels.length,
      countLabel: "channels",
    },
    {
      href: `/teams/${teamId}/tasks`,
      label: "Tasks",
      desc: "Task board and assignments",
      count: allTasks.length,
      countLabel: `${doneTasks} done`,
    },
    {
      href: `/teams/${teamId}/agents`,
      label: "Agents",
      desc: "Manage agent configurations",
      count: agents.length,
      countLabel: `${runningAgents} running`,
    },
    {
      href: `/teams/${teamId}/usage`,
      label: "Usage",
      desc: "Token usage and cost tracking",
      count: totalTokens > 0 ? `$${totalCost.toFixed(2)}` : "--",
      countLabel: totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k tokens` : "no usage",
    },
    {
      href: `/teams/${teamId}/escalations`,
      label: "Escalations",
      desc: "Items requiring human review",
      count: escalations.length,
      countLabel: openEscalations > 0 ? `${openEscalations} open` : "all clear",
      alert: openEscalations > 0,
    },
    {
      href: `/teams/${teamId}/settings`,
      label: "Settings",
      desc: "Team configuration and workspace",
      count: null,
      countLabel: null,
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="text-xs mb-5 inline-flex items-center gap-1 transition-colors hover:underline"
        style={{ color: "var(--muted-foreground)" }}
      >
        &larr; All Teams
      </Link>

      {/* Header */}
      <div
        className="rounded-lg border p-5 mb-5"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
              {team.name}
            </h1>
            {team.goal && (
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {team.goal}
              </p>
            )}
          </div>
          <TeamControls teamId={teamId} initialStatus={team.status} />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border p-4"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                {m.label}
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
              {m.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group p-4 rounded-lg border transition-all hover:border-blue-500/50"
            style={{ backgroundColor: "var(--card)", borderColor: item.alert ? "rgba(239,68,68,0.4)" : "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm" style={{ color: "var(--card-foreground)" }}>
                {item.label}
              </span>
              {item.count !== null && (
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: item.alert ? "rgba(239,68,68,0.15)" : "var(--muted)",
                    color: item.alert ? "#f87171" : "var(--muted-foreground)",
                  }}
                >
                  {item.count}
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {item.desc}
            </div>
            {item.countLabel && (
              <div
                className="text-xs mt-2 pt-2"
                style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}
              >
                {item.countLabel}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Bottom row: Agents + Info side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Agent status */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--card-foreground)" }}>
              Agent Status
            </h2>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {runningAgents}/{agents.length} active
            </span>
          </div>
          {agents.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              No agents configured.{" "}
              <Link href={`/teams/${teamId}/agents`} className="underline hover:no-underline" style={{ color: "#3b82f6" }}>
                Add agents
              </Link>
            </p>
          ) : (
            <div className="space-y-1.5">
              {agents.map((agent) => {
                const sc = agentStatusColor[agent.status] ?? agentStatusColor.idle;
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded"
                    style={{ backgroundColor: "var(--muted)" }}
                  >
                    <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {agent.name}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ml-2 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: sc.dot,
                          boxShadow: agent.status === "running" || agent.status === "thinking" || agent.status === "tool_use"
                            ? `0 0 6px ${sc.dot}`
                            : "none",
                        }}
                      />
                      {agent.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team info */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
            Team Info
          </h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Status</span>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>{team.status}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Agents</span>
              <span style={{ color: "var(--foreground)" }}>{agents.length}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Channels</span>
              <span style={{ color: "var(--foreground)" }}>{channels.length}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Total Tasks</span>
              <span style={{ color: "var(--foreground)" }}>{allTasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Open Escalations</span>
              <span style={{ color: openEscalations > 0 ? "#f87171" : "var(--foreground)" }}>
                {openEscalations}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Cost</span>
              <span style={{ color: "var(--foreground)" }}>
                {totalCost > 0 ? `$${totalCost.toFixed(4)}` : "--"}
              </span>
            </div>
            <div
              className="flex justify-between pt-2.5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--muted-foreground)" }}>Created</span>
              <span style={{ color: "var(--foreground)" }}>
                {new Date(team.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
