"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@chiron-os/shared";
import { MessageBubble } from "./message-bubble";

interface MessageFeedProps {
  messages: Message[];
  loading: boolean;
}

export function MessageFeed({ messages, loading }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only auto-scroll if already near the bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Loading messages...
        </span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No messages yet
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Start the team to begin the conversation
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="py-2">
        {messages.map((msg, idx) => {
          // Group consecutive messages from the same author (within 2 minutes)
          const prev = idx > 0 ? messages[idx - 1] : null;
          const isGrouped =
            prev !== null &&
            prev.authorId === msg.authorId &&
            prev.authorRole === msg.authorRole &&
            msg.authorRole !== "system" &&
            timeDiffSeconds(prev.createdAt, msg.createdAt) < 120;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isGrouped={isGrouped}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function timeDiffSeconds(a: string, b: string): number {
  try {
    return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 1000;
  } catch {
    return Infinity;
  }
}
