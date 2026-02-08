"use client";

import { useState, useEffect } from "react";

interface TeamUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

interface BreakdownEntry {
  agentId: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

interface UsageDashboardProps {
  teamId: string;
  initialUsage: TeamUsage;
  initialBreakdown: BreakdownEntry[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function UsageDashboard({ teamId, initialUsage, initialBreakdown }: UsageDashboardProps) {
  const [usage, setUsage] = useState<TeamUsage>(initialUsage);
  const [breakdown, setBreakdown] = useState<BreakdownEntry[]>(initialBreakdown);

  // Periodically refresh usage data
  useEffect(() => {
    const interval = setInterval(() => {
      Promise.all([
        fetch(`/api/teams/${teamId}/usage`).then((r) => r.json()),
        fetch(`/api/teams/${teamId}/usage/breakdown`).then((r) => r.json()),
      ])
        .then(([u, b]) => {
          setUsage(u as TeamUsage);
          setBreakdown(b as BreakdownEntry[]);
        })
        .catch(console.error);
    }, 10_000);

    return () => clearInterval(interval);
  }, [teamId]);

  const totalTokens = (usage.totalInputTokens ?? 0) + (usage.totalOutputTokens ?? 0);

  // Compute max cost per agent for bar chart
  const maxCost = Math.max(...breakdown.map((b) => b.totalCostUsd ?? 0), 0.001);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Tokens"
          value={formatTokens(totalTokens)}
          sub={`${formatTokens(usage.totalInputTokens ?? 0)} in / ${formatTokens(usage.totalOutputTokens ?? 0)} out`}
          color="#3b82f6"
        />
        <StatCard
          label="Input Tokens"
          value={formatTokens(usage.totalInputTokens ?? 0)}
          sub="prompt tokens"
          color="#a855f7"
        />
        <StatCard
          label="Output Tokens"
          value={formatTokens(usage.totalOutputTokens ?? 0)}
          sub="completion tokens"
          color="#f97316"
        />
        <StatCard
          label="Total Cost"
          value={formatCost(usage.totalCostUsd ?? 0)}
          sub="USD"
          color="#22c55e"
        />
      </div>

      {/* Agent breakdown */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Per-Agent Breakdown
        </h3>
        {breakdown.length === 0 ? (
          <div
            className="text-center py-8 rounded-lg"
            style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
          >
            <p className="text-sm">No usage data yet</p>
            <p className="text-xs mt-1">Usage will appear once agents start working</p>
          </div>
        ) : (
          <div className="space-y-2">
            {breakdown.map((entry, i) => {
              const barWidth = maxCost > 0 ? ((entry.totalCostUsd ?? 0) / maxCost) * 100 : 0;
              return (
                <div
                  key={`${entry.agentId}-${entry.model}-${i}`}
                  className="rounded-lg border p-3"
                  style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: "var(--foreground)" }}>
                        {entry.agentId.slice(0, 8)}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        {entry.model}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium" style={{ color: "#22c55e" }}>
                      {formatCost(entry.totalCostUsd ?? 0)}
                    </span>
                  </div>
                  {/* Bar */}
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--muted)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%`, backgroundColor: "#3b82f6" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {formatTokens(entry.totalInputTokens ?? 0)} in
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {formatTokens(entry.totalOutputTokens ?? 0)} out
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
        {sub}
      </p>
    </div>
  );
}
