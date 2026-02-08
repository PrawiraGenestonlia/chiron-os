"use client";

import { useState, useCallback } from "react";
import type { Channel, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMessages } from "@/hooks/use-messages";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageFeed } from "./message-feed";
import { MessageInput } from "./message-input";

interface MessagesViewProps {
  teamId: string;
  channels: Channel[];
}

export function MessagesView({ teamId, channels }: MessagesViewProps) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    channels[0]?.id ?? null
  );

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const { messages, loading, sendMessage, handleWsEvent } = useMessages({
    teamId,
    channelId: activeChannelId,
  });

  const handleWsMessage = useCallback(
    (event: WSServerEvent) => {
      handleWsEvent(event);
    },
    [handleWsEvent]
  );

  const { connected } = useWebSocket({ teamId, onMessage: handleWsMessage });

  return (
    <div
      className="flex h-full rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      <ChannelSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelect={setActiveChannelId}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              {activeChannel ? `# ${activeChannel.name}` : "Select a channel"}
            </h2>
            {activeChannel?.topic && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {activeChannel.topic}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
            />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Message feed */}
        <MessageFeed messages={messages} loading={loading} />

        {/* Input */}
        {activeChannel && (
          <MessageInput
            channelName={activeChannel.name}
            onSend={sendMessage}
          />
        )}
      </div>
    </div>
  );
}
