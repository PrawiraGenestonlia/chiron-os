"use client";

interface MessageWithChannel {
  id: string;
  channelName: string;
  authorName: string | null;
  authorRole: string;
  content: string;
  messageType: string;
  createdAt: string;
}

interface LiveMessageFeedProps {
  messages: MessageWithChannel[];
}

const CHANNEL_COLORS: Record<string, string> = {
  general: "#3b82f6",
  planning: "#8b5cf6",
  design: "#ec4899",
  engineering: "#22c55e",
  escalations: "#ef4444",
  suggestions: "#f59e0b",
};

export function LiveMessageFeed({ messages }: LiveMessageFeedProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-6" style={{ color: "var(--muted-foreground)" }}>
        <p className="text-xs">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {messages.map((msg) => {
        const channelColor = CHANNEL_COLORS[msg.channelName] ?? "#6b7280";
        const truncated = msg.content.length > 120 ? msg.content.slice(0, 120) + "..." : msg.content;

        return (
          <div
            key={msg.id}
            className="flex items-start gap-2 py-1.5 px-2 rounded text-xs"
            style={{ backgroundColor: "var(--background)" }}
          >
            <span
              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: `${channelColor}20`, color: channelColor }}
            >
              #{msg.channelName}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                {msg.authorName ?? (msg.authorRole === "system" ? "System" : "Unknown")}
              </span>
              <span className="ml-1.5" style={{ color: "var(--muted-foreground)" }}>
                {truncated}
              </span>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
              {formatTime(msg.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
