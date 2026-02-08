"use client";

import { useState, useCallback } from "react";
import type { Channel, Message, WSServerEvent } from "@chiron-os/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMessages } from "@/hooks/use-messages";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageFeed } from "./message-feed";
import { MessageInput } from "./message-input";
import { SearchInput } from "@/components/ui/search-input";

interface MessagesViewProps {
  teamId: string;
  channels: Channel[];
}

export function MessagesView({ teamId, channels: initialChannels }: MessagesViewProps) {
  const [channelList, setChannelList] = useState<Channel[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    initialChannels[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);

  const activeChannel = channelList.find((c) => c.id === activeChannelId);

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

  const refreshChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/channels`);
      if (res.ok) {
        const data = (await res.json()) as Channel[];
        setChannelList(data);
      }
    } catch {
      // ignore
    }
  }, [teamId]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (activeChannelId) params.set("channelId", activeChannelId);
      const res = await fetch(`/api/teams/${teamId}/messages/search?${params}`);
      if (res.ok) {
        setSearchResults((await res.json()) as Message[]);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [teamId, activeChannelId]);

  const displayMessages = searchResults ?? messages;
  const isSearchActive = searchResults !== null;

  return (
    <div
      className="flex h-full rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      <ChannelSidebar
        channels={channelList}
        activeChannelId={activeChannelId}
        onSelect={(id) => { setActiveChannelId(id); setSearchResults(null); setSearchQuery(""); }}
        teamId={teamId}
        onChannelCreated={refreshChannels}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0">
              <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                {activeChannel ? `# ${activeChannel.name}` : "Select a channel"}
              </h2>
              {activeChannel?.topic && (
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {activeChannel.topic}
                </p>
              )}
            </div>
            <div className="flex-1 max-w-xs">
              <SearchInput
                placeholder="Search messages..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
            />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Search indicator */}
        {isSearchActive && (
          <div
            className="px-4 py-1.5 text-xs flex items-center justify-between border-b"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            <span>{searching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}</span>
            <button
              onClick={() => { setSearchResults(null); setSearchQuery(""); }}
              className="text-xs underline"
              style={{ color: "var(--muted-foreground)" }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Message feed */}
        <MessageFeed messages={displayMessages} loading={loading && !isSearchActive} />

        {/* Input */}
        {activeChannel && !isSearchActive && (
          <MessageInput
            channelName={activeChannel.name}
            onSend={sendMessage}
          />
        )}
      </div>
    </div>
  );
}
