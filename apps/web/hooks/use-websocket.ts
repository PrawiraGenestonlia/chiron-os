"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WSServerEvent, WSClientEvent } from "@chiron-os/shared";

interface UseWebSocketOptions {
  teamId: string;
  onMessage?: (event: WSServerEvent) => void;
}

export function useWebSocket({ teamId, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchToken(): Promise<string | null> {
      if (tokenRef.current) return tokenRef.current;
      try {
        const res = await fetch("/api/auth/token");
        if (res.ok) {
          const data = await res.json();
          tokenRef.current = data.token;
          return data.token;
        }
      } catch {
        // Token fetch failed
      }
      return null;
    }

    async function connect() {
      if (!mountedRef.current) return;

      const token = await fetchToken();

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", data: { teamId, token } }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSServerEvent;
          onMessageRef.current?.(data);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 2s
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [teamId]);

  const send = useCallback((event: WSClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { connected, send };
}
