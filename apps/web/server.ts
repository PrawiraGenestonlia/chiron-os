import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { DEFAULT_PORT } from "@chiron-os/shared";
import { LifecycleManager, EscalationManager } from "@chiron-os/core";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);

const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

// Track subscriptions: teamId -> Set<WebSocket>
const subscriptions = new Map<string, Set<WebSocket>>();

function broadcast(teamId: string, event: unknown) {
  const clients = subscriptions.get(teamId);
  if (!clients) return;
  const data = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Global lifecycle manager and escalation manager — shared with API routes via globalThis
const lifecycle = new LifecycleManager();
const escalationManager = new EscalationManager();
lifecycle.setEscalationManager(escalationManager);

// Wire escalation events to WebSocket broadcasts
escalationManager.on("escalation:new", (data: { teamId: string; escalation: unknown }) => {
  broadcast(data.teamId, { type: "escalation:new", data: data.escalation });
});

escalationManager.on("escalation:resolved", (data: { teamId: string; escalation: unknown }) => {
  broadcast(data.teamId, { type: "escalation:resolved", data: data.escalation });
});

escalationManager.on("vote:started", (data: { teamId: string; escalation: unknown; topic: string; options: string[] }) => {
  broadcast(data.teamId, { type: "vote:started", data });
});

escalationManager.on("vote:resolved", (data: { teamId: string; escalationId: string; winner: string; votes: Record<string, string> }) => {
  broadcast(data.teamId, { type: "vote:resolved", data });
});

escalationManager.on("vote:deadlocked", (data: { teamId: string; escalationId: string; topic: string; votes: Record<string, string> }) => {
  broadcast(data.teamId, { type: "vote:deadlocked", data });
});

// Wire lifecycle events to WebSocket broadcasts
lifecycle.on("agent:status", (data: { agentId: string; status: string; teamId: string }) => {
  broadcast(data.teamId, { type: "agent:status", data });
});

lifecycle.on("agent:stream", (data: { agentId: string; chunk: string; teamId: string }) => {
  broadcast(data.teamId, { type: "agent:stream", data });
});

lifecycle.on("team:status", (data: { teamId: string; status: string }) => {
  broadcast(data.teamId, { type: "team:status", data });
});

lifecycle.on("bus:message", (data: { teamId: string; message: unknown }) => {
  broadcast(data.teamId, { type: "message:new", data: data.message });
});

// Expose managers globally for API routes
(globalThis as Record<string, unknown>).__chiron_lifecycle = lifecycle;
(globalThis as Record<string, unknown>).__chiron_broadcast = broadcast;
(globalThis as Record<string, unknown>).__chiron_escalation = escalationManager;

// Export for use by core runtime
export { broadcast, lifecycle, escalationManager };

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const subscribedTeams = new Set<string>();

    ws.on("message", (raw) => {
      try {
        const event = JSON.parse(raw.toString());

        switch (event.type) {
          case "subscribe": {
            const teamId = event.data?.teamId;
            if (teamId) {
              subscribedTeams.add(teamId);
              if (!subscriptions.has(teamId)) {
                subscriptions.set(teamId, new Set());
              }
              subscriptions.get(teamId)!.add(ws);
            }
            break;
          }
          case "unsubscribe": {
            const teamId = event.data?.teamId;
            if (teamId) {
              subscribedTeams.delete(teamId);
              subscriptions.get(teamId)?.delete(ws);
            }
            break;
          }
          case "message:send": {
            const { teamId, channelName, content } = event.data ?? {};
            if (teamId && channelName && content) {
              // Limit content size to prevent abuse
              const truncated = typeof content === "string" ? content.slice(0, 10000) : "";
              if (truncated) {
                lifecycle.sendHumanMessage(teamId, channelName, truncated);
              }
            }
            break;
          }
          case "agent:restart": {
            const agentId = event.data?.agentId;
            if (agentId && typeof agentId === "string") {
              lifecycle.restartAgent(agentId).catch((err) => {
                console.error("Failed to restart agent:", err);
              });
            }
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      for (const teamId of subscribedTeams) {
        subscriptions.get(teamId)?.delete(ws);
        if (subscriptions.get(teamId)?.size === 0) {
          subscriptions.delete(teamId);
        }
      }
    });
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down Chiron OS...");
    lifecycle.shutdown();
    wss.close();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, () => {
    console.log(`\n  Chiron OS running at http://localhost:${port}\n`);
  });
});
