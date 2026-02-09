import { query, createSdkMcpServer, tool, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { buildSystemPrompt } from "./prompt-builder.js";
import type { BusMcpContext } from "../mcp/bus-mcp-server.js";
import { handleBusTool } from "../mcp/bus-mcp-server.js";
import type { BusToolName } from "../mcp/bus-mcp-server.js";
import { MessageBus } from "../bus/message-bus.js";
import { TokenTracker } from "../tracking/token-tracker.js";
import { EscalationManager } from "../escalation/escalation-manager.js";
import { updateAgentStatus, getOAuthTokensForServers, upsertOAuthToken } from "@chiron-os/db";
import type { AgentStatus } from "@chiron-os/shared";
import {
  DEFAULT_MODEL,
  resolveApiKey,
  loadConfig,
  isHttpMcpServer,
  MESSAGE_QUEUE_MAX_SIZE,
  MESSAGE_QUEUE_AGGREGATION_THRESHOLD,
  MESSAGE_QUEUE_KEEP_RECENT,
  MESSAGE_QUEUE_CONTENT_TRUNCATE_LENGTH,
  DEFAULT_CONTEXT_WINDOW_THRESHOLD,
} from "@chiron-os/shared";
import type { McpServerConfig } from "@chiron-os/shared";
import { refreshAccessToken } from "../oauth/mcp-oauth.js";

export interface AgentRunnerConfig {
  agentId: string;
  teamId: string;
  personaId: string;
  agentName: string;
  model?: string;
  workspacePath: string;
  bus: MessageBus;
  tokenTracker: TokenTracker;
  escalationManager?: EscalationManager;
  teamAgentCount?: number;
  onStatusChange?: (agentId: string, status: AgentStatus) => void;
  onStream?: (agentId: string, chunk: string) => void;
}

/**
 * Wrap a synchronous bus tool handler as an async MCP handler
 */
function busHandler(ctx: BusMcpContext, toolName: BusToolName) {
  return async (args: Record<string, unknown>) => {
    const result = handleBusTool(ctx, toolName, args);
    return result;
  };
}

/**
 * Create an in-process SDK MCP server with all bus tools
 */
function createBusMcpServerForAgent(ctx: BusMcpContext) {
  return createSdkMcpServer({
    name: "chiron-bus",
    version: "1.0.0",
    tools: [
      tool("send_message", "Send a message to a team channel. Use this to communicate with teammates.", {
        channel: z.string().describe("Channel name (e.g., 'general', 'planning', 'engineering', 'design')"),
        content: z.string().describe("Message content"),
        message_type: z.optional(z.enum(["text", "code", "decision", "vote", "task_update", "feedback"])).describe("Type of message (default: text)"),
        thread_id: z.optional(z.string()).describe("Optional thread ID for replies"),
      }, busHandler(ctx, "send_message")),

      tool("read_channel", "Read recent messages from a team channel. Use this to catch up on conversations.", {
        channel: z.string().describe("Channel name (e.g., 'general', 'planning', 'engineering')"),
        limit: z.optional(z.number()).describe("Max messages to return (default: 20)"),
      }, busHandler(ctx, "read_channel")),

      tool("create_task", "Create a task on the team's task board. Use this to break down work.", {
        title: z.string().describe("Task title"),
        description: z.optional(z.string()).describe("Task description"),
        status: z.optional(z.enum(["backlog", "todo", "in_progress", "review", "done", "blocked"])).describe("Task status (default: todo)"),
        priority: z.optional(z.enum(["low", "medium", "high", "critical"])).describe("Task priority (default: medium)"),
        assignee_id: z.optional(z.string()).describe("Agent ID to assign the task to"),
      }, busHandler(ctx, "create_task")),

      tool("update_task", "Update an existing task on the task board.", {
        task_id: z.string().describe("Task ID to update"),
        title: z.optional(z.string()).describe("New title"),
        description: z.optional(z.string()).describe("New description"),
        status: z.optional(z.enum(["backlog", "todo", "in_progress", "review", "done", "blocked"])).describe("New status"),
        priority: z.optional(z.enum(["low", "medium", "high", "critical"])).describe("New priority"),
        assignee_id: z.optional(z.string()).describe("New assignee agent ID"),
      }, busHandler(ctx, "update_task")),

      tool("list_tasks", "List all tasks on the team's task board.", {}, busHandler(ctx, "list_tasks")),

      tool("call_vote", "Start a vote among team agents. If vote deadlocks, it auto-escalates to the human.", {
        topic: z.string().describe("What the vote is about"),
        options: z.array(z.string()).describe("Vote options (at least 2)"),
        channel: z.optional(z.string()).describe("Channel for the vote (default: escalations)"),
      }, busHandler(ctx, "call_vote")),

      tool("cast_vote", "Cast your vote in an active vote session.", {
        escalation_id: z.string().describe("The escalation/vote ID"),
        choice: z.string().describe("Your chosen option"),
      }, busHandler(ctx, "cast_vote")),

      tool("escalate", "Escalate an issue to the human operator. Use when stuck or need a decision.", {
        reason: z.string().describe("Detailed reason — include what went wrong, what you need, and suggestions"),
        channel: z.optional(z.string()).describe("Channel for the escalation (default: escalations)"),
      }, busHandler(ctx, "escalate")),

      tool("save_learning", "Save a team learning or insight for future reference. All team members will see saved learnings.", {
        category: z.string().describe("Category (e.g., 'technical', 'process', 'design', 'user_feedback', 'decision')"),
        content: z.string().describe("The learning or insight to save"),
      }, busHandler(ctx, "save_learning")),

      tool("get_learnings", "Retrieve saved team learnings and past decisions.", {
        category: z.optional(z.string()).describe("Filter by category, or omit for all"),
      }, busHandler(ctx, "get_learnings")),
    ],
  });
}

/**
 * Convert user-configured MCP servers to SDK-compatible format.
 * Adds type discriminator: stdio servers get type 'stdio', URL servers default to 'http'.
 * If oauthTokens are provided, injects Authorization headers for matching HTTP servers.
 */
function buildExternalMcpServers(
  servers: Record<string, McpServerConfig>,
  oauthTokens?: Map<string, { accessToken: string; tokenType: string }>
): Record<string, { type?: "stdio"; command: string; args?: string[]; env?: Record<string, string> } | { type: "http" | "sse"; url: string; headers?: Record<string, string> }> {
  const result: Record<string, { type?: "stdio"; command: string; args?: string[]; env?: Record<string, string> } | { type: "http" | "sse"; url: string; headers?: Record<string, string> }> = {};
  for (const [name, cfg] of Object.entries(servers)) {
    if (isHttpMcpServer(cfg)) {
      const headers = { ...cfg.headers };
      const token = oauthTokens?.get(name);
      if (token && !headers["Authorization"]) {
        headers["Authorization"] = `${token.tokenType} ${token.accessToken}`;
      }
      result[name] = { type: cfg.type ?? "http", url: cfg.url, headers };
    } else {
      result[name] = { type: cfg.type ?? "stdio", command: cfg.command, args: cfg.args, env: cfg.env };
    }
  }
  return result;
}

export class AgentRunner extends EventEmitter {
  private config: AgentRunnerConfig;
  private abortController: AbortController;
  private messageQueue: SDKUserMessage[] = [];
  private messageResolve: (() => void) | null = null;
  private running = false;
  private sessionId: string;

  // Backpressure
  private queueMaxSize: number;
  private aggregationThreshold: number;

  // Context rotation
  private cumulativeInputTokens = 0;
  private contextWindowThreshold: number;
  private contextSummary: string | null = null;

  constructor(config: AgentRunnerConfig) {
    super();
    this.config = config;
    this.abortController = new AbortController();
    this.sessionId = randomUUID();

    const appConfig = loadConfig(process.cwd());
    this.queueMaxSize = appConfig.messageQueueMaxSize ?? MESSAGE_QUEUE_MAX_SIZE;
    this.aggregationThreshold = appConfig.messageQueueAggregationThreshold ?? MESSAGE_QUEUE_AGGREGATION_THRESHOLD;
    this.contextWindowThreshold = appConfig.contextWindowThreshold ?? DEFAULT_CONTEXT_WINDOW_THRESHOLD;
  }

  get agentId(): string {
    return this.config.agentId;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get currentInputTokens(): number {
    return this.cumulativeInputTokens;
  }

  /**
   * Set a context summary for rotation — called by LifecycleManager before restart
   */
  setContextSummary(summary: string): void {
    this.contextSummary = summary;
  }

  private makeUserMessage(content: string): SDKUserMessage {
    return {
      type: "user",
      message: { role: "user", content },
      parent_tool_use_id: null,
      session_id: this.sessionId,
    };
  }

  /**
   * Enqueue a message to be delivered to the agent
   */
  enqueueMessage(content: string): void {
    this.messageQueue.push(this.makeUserMessage(content));
    // Evict oldest messages if queue exceeds max size
    while (this.messageQueue.length > this.queueMaxSize) {
      this.messageQueue.shift();
    }
    if (this.messageResolve) {
      this.messageResolve();
      this.messageResolve = null;
    }
  }

  /**
   * Aggregate old messages into a catch-up summary when queue is large
   */
  private *aggregateAndYield(): Generator<SDKUserMessage> {
    const highPriority: SDKUserMessage[] = [];
    const regular: SDKUserMessage[] = [];

    for (const msg of this.messageQueue) {
      const content = msg.message.content as string;
      if (content.includes("[#escalations]") || content.startsWith("[System:")) {
        highPriority.push(msg);
      } else {
        regular.push(msg);
      }
    }
    this.messageQueue = [];

    // Yield high-priority messages individually
    for (const msg of highPriority) {
      yield msg;
    }

    if (regular.length <= MESSAGE_QUEUE_KEEP_RECENT) {
      // Not enough to summarize, yield individually
      for (const msg of regular) {
        yield msg;
      }
      return;
    }

    // Split: old messages → summary, recent → individual
    const recentStart = regular.length - MESSAGE_QUEUE_KEEP_RECENT;
    const old = regular.slice(0, recentStart);
    const recent = regular.slice(recentStart);

    // Build summary of old messages
    const summaryLines = old.map((msg) => {
      const content = msg.message.content as string;
      const truncated = content.length > MESSAGE_QUEUE_CONTENT_TRUNCATE_LENGTH
        ? content.slice(0, MESSAGE_QUEUE_CONTENT_TRUNCATE_LENGTH) + "..."
        : content;
      return `- ${truncated}`;
    });

    yield this.makeUserMessage(
      `[Catch-up Summary] While you were busy, ${old.length} messages arrived:\n${summaryLines.join("\n")}`
    );

    // Yield recent messages individually
    for (const msg of recent) {
      yield msg;
    }
  }

  /**
   * Async generator that yields messages to the SDK
   */
  private async *messageStream(): AsyncIterable<SDKUserMessage> {
    const team = await import("@chiron-os/db").then((m) => m.getTeamById(this.config.teamId));

    // If we have a context summary from rotation, use it instead of the standard intro
    if (this.contextSummary) {
      yield this.makeUserMessage(this.contextSummary);
    } else {
      yield this.makeUserMessage(
        `You are ${this.config.agentName}. ${team?.goal ? `The team's current goal is: ${team.goal}` : "No goal has been set yet."}\n\nFirst, call list_tasks to see if there are existing tasks. Then read #planning for context. Post a single brief introduction to #general (one sentence max) and immediately begin working on your responsibilities. Do NOT send multiple messages — focus on producing deliverables.`
      );
    }

    while (!this.abortController.signal.aborted) {
      if (this.messageQueue.length > 0) {
        // Check if we need to aggregate
        if (this.messageQueue.length > this.aggregationThreshold) {
          yield* this.aggregateAndYield();
        } else {
          yield this.messageQueue.shift()!;
        }
      } else {
        await new Promise<void>((resolve) => {
          this.messageResolve = resolve;
          const onAbort = () => {
            resolve();
            this.abortController.signal.removeEventListener("abort", onAbort);
          };
          this.abortController.signal.addEventListener("abort", onAbort);
        });
      }
    }
  }

  /**
   * Start the agent's query loop
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const projectRoot = process.cwd();
    const config = loadConfig(projectRoot);
    const apiKey = resolveApiKey(config);
    const model = this.config.model ?? config.defaultModel ?? DEFAULT_MODEL;

    console.log(`[${this.config.agentName}] API key: ${apiKey ? "configured" : "MISSING"}, model: ${model}`);

    this.setStatus("running");

    const mcpServerNames = Object.keys(config.mcpServers);

    const systemPrompt = buildSystemPrompt({
      agentId: this.config.agentId,
      agentName: this.config.agentName,
      teamId: this.config.teamId,
      personaId: this.config.personaId,
      workspacePath: this.config.workspacePath,
      mcpServerNames: mcpServerNames.length > 0 ? mcpServerNames : undefined,
    });

    // Create in-process MCP server with bus tools
    const busCtx: BusMcpContext = {
      agentId: this.config.agentId,
      agentName: this.config.agentName,
      teamId: this.config.teamId,
      bus: this.config.bus,
      escalationManager: this.config.escalationManager,
      teamAgentCount: this.config.teamAgentCount,
    };

    const busMcpServer = createBusMcpServerForAgent(busCtx);

    // Fetch OAuth tokens for HTTP MCP servers
    const oauthTokenMap = new Map<string, { accessToken: string; tokenType: string }>();
    const httpServerNames = Object.entries(config.mcpServers)
      .filter(([, cfg]) => isHttpMcpServer(cfg))
      .map(([name]) => name);

    if (httpServerNames.length > 0) {
      const storedTokens = getOAuthTokensForServers(httpServerNames);
      for (const t of storedTokens) {
        const isExpired = t.expiresAt ? new Date(t.expiresAt) < new Date() : false;
        if (isExpired && t.refreshToken && t.tokenEndpoint && t.clientId) {
          try {
            const refreshed = await refreshAccessToken({
              tokenEndpoint: t.tokenEndpoint,
              refreshToken: t.refreshToken,
              clientId: t.clientId,
              clientSecret: t.clientSecret ?? undefined,
            });
            const expiresAt = refreshed.expires_in
              ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
              : null;
            upsertOAuthToken({
              serverName: t.serverName,
              serverUrl: t.serverUrl,
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token ?? t.refreshToken,
              tokenType: refreshed.token_type ?? t.tokenType,
              expiresAt,
              clientId: t.clientId,
              clientSecret: t.clientSecret,
              tokenEndpoint: t.tokenEndpoint,
              authorizationEndpoint: t.authorizationEndpoint,
              registrationEndpoint: t.registrationEndpoint,
            });
            oauthTokenMap.set(t.serverName, {
              accessToken: refreshed.access_token,
              tokenType: refreshed.token_type ?? "Bearer",
            });
            console.log(`[${this.config.agentName}] Refreshed OAuth token for ${t.serverName}`);
          } catch (err) {
            console.error(`[${this.config.agentName}] Failed to refresh token for ${t.serverName}:`, err);
          }
        } else if (!isExpired) {
          oauthTokenMap.set(t.serverName, {
            accessToken: t.accessToken,
            tokenType: t.tokenType,
          });
        }
      }
    }

    try {
      console.log(`[${this.config.agentName}] Starting SDK query with model=${model}`);

      console.log(`[${this.config.agentName}] Workspace: ${this.config.workspacePath}`);

      const q = query({
        prompt: this.messageStream(),
        options: {
          model,
          systemPrompt,
          cwd: this.config.workspacePath,
          maxTurns: Infinity,
          abortController: this.abortController,
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          mcpServers: {
            "chiron-bus": busMcpServer,
            ...buildExternalMcpServers(config.mcpServers, oauthTokenMap),
          },
          hooks: {
            Stop: [{
              hooks: [async () => {
                console.log(`[${this.config.agentName}] Stop hook fired — returning continue: true`);
                return { continue: true };
              }],
            }],
          },
          env: apiKey
            ? { ...process.env, ANTHROPIC_API_KEY: apiKey }
            : { ...process.env },
          stderr: (data: string) => {
            console.error(`[${this.config.agentName}] STDERR: ${data.slice(0, 500)}`);
          },
        },
      });

      for await (const message of q) {
        if (this.abortController.signal.aborted) break;

        console.log(`[${this.config.agentName}] Message: ${message.type}${message.type === "result" ? ` (${(message as { subtype?: string }).subtype})` : ""}`);

        if (message.type === "assistant") {
          const content = message.message.content;
          const types = content.map((b: { type: string }) => b.type);
          console.log(`[${this.config.agentName}] Assistant blocks: ${JSON.stringify(types)}`);
          const hasToolUse = types.includes("tool_use");
          const textBlocks = content.filter(
            (b: { type: string }) => b.type === "text"
          );
          for (const block of textBlocks) {
            if ("text" in block) {
              console.log(`[${this.config.agentName}] Text: ${(block.text as string).slice(0, 200)}`);
              this.emit("text", block.text);
            }
          }
          this.setStatus(hasToolUse ? "tool_use" : "thinking");
        }

        if (message.type === "stream_event") {
          const event = message.event;
          if (
            event.type === "content_block_delta" &&
            "delta" in event &&
            event.delta.type === "text_delta"
          ) {
            this.config.onStream?.(this.config.agentId, event.delta.text);
          }
        }

        if (message.type === "result") {
          if (message.subtype === "success") {
            this.config.tokenTracker.record({
              agentId: this.config.agentId,
              teamId: this.config.teamId,
              model,
              inputTokens: message.usage.input_tokens ?? 0,
              outputTokens: message.usage.output_tokens ?? 0,
              costUsd: message.total_cost_usd,
            });

            // Track cumulative input tokens for context rotation
            this.cumulativeInputTokens += message.usage.input_tokens ?? 0;
            if (this.cumulativeInputTokens >= this.contextWindowThreshold) {
              this.emit("context:rotation_needed", {
                agentId: this.config.agentId,
                cumulativeInputTokens: this.cumulativeInputTokens,
              });
            }
          }

          if (message.subtype !== "success") {
            this.emit("error", {
              subtype: message.subtype,
              errors: "errors" in message ? message.errors : [],
            });
          }
        }
      }
    } catch (err) {
      if (!this.abortController.signal.aborted) {
        this.emit("error", { message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      this.running = false;
      this.setStatus("stopped");
    }
  }

  /**
   * Stop the agent gracefully
   */
  stop(): void {
    this.abortController.abort();
    if (this.messageResolve) {
      this.messageResolve();
      this.messageResolve = null;
    }
  }

  private setStatus(status: AgentStatus): void {
    updateAgentStatus(this.config.agentId, status);
    this.config.onStatusChange?.(this.config.agentId, status);
    this.emit("status", status);
  }
}
