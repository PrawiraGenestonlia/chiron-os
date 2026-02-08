"use client";

import type { Message } from "@chiron-os/shared";

interface TimelineEvent {
  id: string;
  type: "message" | "task" | "escalation" | "status";
  text: string;
  timestamp: string;
  color: string;
  icon: string;
}

interface MessageWithChannel extends Message {
  channelName: string;
}

interface ActivityTimelineProps {
  messages: MessageWithChannel[];
  taskEvents: TimelineEvent[];
  escalationEvents: TimelineEvent[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ActivityTimeline({ messages, taskEvents, escalationEvents }: ActivityTimelineProps) {
  const events: TimelineEvent[] = [
    ...messages.map((m) => ({
      id: m.id,
      type: "message" as const,
      text: `${m.authorName ?? m.authorRole} in #${m.channelName}: ${m.content.slice(0, 80)}${m.content.length > 80 ? "..." : ""}`,
      timestamp: m.createdAt,
      color: "#3b82f6",
      icon: "M",
    })),
    ...taskEvents,
    ...escalationEvents,
  ];

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const display = events.slice(0, 20);

  if (display.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>
        <p className="text-xs">No recent activity</p>
        <p className="text-xs mt-1">Start the team to begin</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {display.map((evt) => (
        <div
          key={evt.id}
          className="flex items-start gap-2 py-1.5 px-2 rounded text-xs"
          style={{ backgroundColor: "var(--background)" }}
        >
          <span className="shrink-0 text-[10px] tabular-nums mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {formatTime(evt.timestamp)}
          </span>
          <span
            className="shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold mt-0.5"
            style={{ backgroundColor: `${evt.color}20`, color: evt.color }}
          >
            {evt.icon}
          </span>
          <span className="flex-1 min-w-0 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {evt.text}
          </span>
        </div>
      ))}
    </div>
  );
}
