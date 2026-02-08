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
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No messages yet. Start the conversation!
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="py-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
