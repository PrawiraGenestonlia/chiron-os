"use client";

import Link from "next/link";
import type { Task, Escalation } from "@chiron-os/shared";

interface AlertSectionProps {
  teamId: string;
  escalations: Escalation[];
  tasks: Task[];
}

export function AlertSection({ teamId, escalations, tasks }: AlertSectionProps) {
  const openEscalations = escalations.filter((e) => e.status === "open");
  const blockedTasks = tasks.filter((t) => t.status === "blocked");

  if (openEscalations.length === 0 && blockedTasks.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border p-3 space-y-1.5"
      style={{
        backgroundColor: "rgba(239,68,68,0.05)",
        borderColor: "rgba(239,68,68,0.2)",
      }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#f87171" }}>
        Needs Attention
      </h3>
      {openEscalations.length > 0 && (
        <AlertRow
          icon="!"
          color="#ef4444"
          text={`${openEscalations.length} escalation${openEscalations.length !== 1 ? "s" : ""} need review`}
          href={`/teams/${teamId}/escalations`}
        />
      )}
      {blockedTasks.map((task) => {
        const ageMs = Date.now() - new Date(task.createdAt).getTime();
        const ageH = Math.round(ageMs / 3_600_000);
        return (
          <AlertRow
            key={task.id}
            icon="B"
            color="#eab308"
            text={`"${task.title}" blocked${ageH > 0 ? ` for ${ageH}h` : ""}`}
            href={`/teams/${teamId}/tasks`}
          />
        );
      })}
    </div>
  );
}

function AlertRow({
  icon,
  color,
  text,
  href,
}: {
  icon: string;
  color: string;
  text: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0 truncate" style={{ color: "var(--foreground)" }}>
        {text}
      </span>
      <Link
        href={href}
        className="shrink-0 underline"
        style={{ color: "var(--muted-foreground)" }}
      >
        View
      </Link>
    </div>
  );
}
