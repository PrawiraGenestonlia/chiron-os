"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Message, WSServerEvent } from "@chiron-os/shared";

interface UseMessagesOptions {
  teamId: string;
  channelId: string | null;
}

export function useMessages({ teamId, channelId }: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelIdRef = useRef(channelId);
  channelIdRef.current = channelId;

  // Load message history from REST
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/teams/${teamId}/channels/${channelId}/messages?limit=100`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        if (!cancelled && channelIdRef.current === channelId) {
          setMessages(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, channelId]);

  // Handle incoming WebSocket messages
  const handleWsEvent = useCallback(
    (event: WSServerEvent) => {
      if (event.type === "message:new") {
        const msg = event.data;
        // Only add if it's for the current channel
        if (msg.channelId === channelIdRef.current) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }
    },
    []
  );

  // Send a human message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!channelId) return;

      const res = await fetch(
        `/api/teams/${teamId}/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            authorRole: "human",
            authorName: "Human",
            messageType: "text",
          }),
        }
      );

      if (res.ok) {
        const msg = (await res.json()) as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    },
    [teamId, channelId]
  );

  return { messages, loading, sendMessage, handleWsEvent };
}
