import { EventEmitter } from "node:events";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AgentRunner, type AgentRunnerConfig } from "./agent-runner.js";
import { buildContextRotationSummary } from "./prompt-builder.js";
import { IdleMonitor } from "./idle-monitor.js";
import { MessageBus } from "../bus/message-bus.js";
import { TokenTracker } from "../tracking/token-tracker.js";
import { getLogger } from "../logging/logger.js";
import {
  getAgentsByTeam,
  getTeamById,
  getAllTeams,
  updateTeam,
  updateAgentStatus,
  createAgent,
} from "@chiron-os/db";
import { EscalationManager } from "../escalation/escalation-manager.js";
import {
  loadConfig,
  getChironDir,
  AGENT_MAX_RESTART_ATTEMPTS,
  AGENT_RESTART_BACKOFF_BASE_MS,
  AGENT_RESTART_BACKOFF_MAX_MS,
  IDLE_NUDGE_DEFAULT_INTERVAL_MS,
  IDLE_NUDGE_DEFAULT_BUDGET_THRESHOLD,
} from "@chiron-os/shared";
import type { AgentStatus, AgentCreate } from "@chiron-os/shared";

interface AgentEntry {
  runner: AgentRunner;
  failCount: number;
  restartTimer: ReturnType<typeof setTimeout> | null;
  busListener: (message: unknown) => void;
}

export class LifecycleManager extends EventEmitter {
  private agents = new Map<string, AgentEntry>();
  private buses = new Map<string, MessageBus>();
  private idleMonitors = new Map<string, IdleMonitor>();
  private runtimeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private teamStartedAt = new Map<string, string>();
  private teamMaxRuntime = new Map<string, number>();
  private tokenTracker = new TokenTracker();
  private escalationManager?: EscalationManager;
  private broadcastFn?: (teamId: string, event: unknown) => void;
  private pendingContextSummaries = new Map<string, string>();

  constructor() {
    super();
    // Wire budget config
    const config = loadConfig();
    if (config.maxBudgetUsd) {
      this.tokenTracker.setMaxBudget(config.maxBudgetUsd);
    }
    // Forward usage events for WebSocket broadcasting
    this.tokenTracker.on("usage", (entry: { teamId: string; costUsd: number }) => {
      this.emit("usage:update", entry);
    });

    // Listen for budget exceeded and stop the team
    this.tokenTracker.on("budget:exceeded", (data: { teamId: string; totalCost: number; maxBudget: number }) => {
      console.warn(`Budget exceeded for team ${data.teamId}: $${data.totalCost.toFixed(2)} >= $${data.maxBudget}`);
      this.stopTeam(data.teamId);
    });
  }

  setEscalationManager(em: EscalationManager): void {
    this.escalationManager = em;
  }

  setBroadcast(fn: (teamId: string, event: unknown) => void): void {
    this.broadcastFn = fn;
  }

  /**
   * Get the workspace directory for a team. Creates it if it doesn't exist.
   */
  private ensureWorkspace(teamId: string): string {
    const workspaceDir = join(getChironDir(), "workspaces", teamId);
    mkdirSync(workspaceDir, { recursive: true });
    return workspaceDir;
  }

  /**
   * Get or create a MessageBus for a team
   */
  getBus(teamId: string): MessageBus {
    let bus = this.buses.get(teamId);
    if (!bus) {
      bus = new MessageBus(teamId);
      this.buses.set(teamId, bus);
      // Re-emit bus messages for WebSocket broadcasting + idle monitor activity
      bus.on("message", (message) => {
        this.emit("bus:message", { teamId, message });
        const monitor = this.idleMonitors.get(teamId);
        if (monitor) {
          if ((message as { authorRole?: string }).authorRole === "human") {
            monitor.recordHumanActivity();
          } else {
            monitor.recordActivity();
          }
        }
      });
    }
    return bus;
  }

  /**
   * Add an agent to a team and return the created agent record
   */
  addAgent(data: AgentCreate) {
    const agent = createAgent(data);
    return agent;
  }

  /**
   * Clean up an existing agent entry (stop runner, remove bus listener, clear timers)
   */
  private cleanupAgent(agentId: string): void {
    const existing = this.agents.get(agentId);
    if (!existing) return;

    if (existing.restartTimer) {
      clearTimeout(existing.restartTimer);
    }

    // Remove the bus listener to prevent memory leaks
    for (const [, bus] of this.buses) {
      bus.off("message", existing.busListener);
    }

    existing.runner.removeAllListeners();
    existing.runner.stop();
    this.agents.delete(agentId);
  }

  /**
   * Start a single agent
   */
  async startAgent(agentId: string): Promise<void> {
    // Clean up any existing runner, listeners, and timers
    this.cleanupAgent(agentId);

    // Small delay to let old runner's finally block settle before we set new status
    await new Promise((r) => setTimeout(r, 100));

    const agentRecord = await import("@chiron-os/db").then((m) => m.getAgentById(agentId));
    if (!agentRecord) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const bus = this.getBus(agentRecord.teamId);
    const workspacePath = this.ensureWorkspace(agentRecord.teamId);

    const teamAgents = getAgentsByTeam(agentRecord.teamId);

    const config: AgentRunnerConfig = {
      agentId: agentRecord.id,
      teamId: agentRecord.teamId,
      personaId: agentRecord.personaId,
      agentName: agentRecord.name,
      model: agentRecord.modelOverride ?? undefined,
      workspacePath,
      bus,
      tokenTracker: this.tokenTracker,
      escalationManager: this.escalationManager,
      teamAgentCount: teamAgents.length,
      broadcast: this.broadcastFn,
      onStatusChange: (id, status) => {
        this.emit("agent:status", { agentId: id, status, teamId: agentRecord.teamId });
      },
      onStream: (id, chunk) => {
        this.emit("agent:stream", { agentId: id, chunk, teamId: agentRecord.teamId });
      },
    };

    const runner = new AgentRunner(config);

    // Apply pending context summary from rotation
    const pendingSummary = this.pendingContextSummaries.get(agentId);
    if (pendingSummary) {
      runner.setContextSummary(pendingSummary);
      this.pendingContextSummaries.delete(agentId);
    }

    // Create the bus listener as a named function so we can remove it later
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const busListener = (message: any) => {
      if (message.authorId === agentId) return;
      const channelLabel = message.channelName ?? "unknown";
      runner.enqueueMessage(
        `[#${channelLabel}] ${message.authorName ?? message.authorRole ?? "unknown"}: ${message.content ?? ""}`
      );
    };

    const entry: AgentEntry = { runner, failCount: 0, restartTimer: null, busListener };
    this.agents.set(agentId, entry);

    const logger = getLogger();

    // Handle context rotation
    runner.on("context:rotation_needed", async (data: { agentId: string; cumulativeInputTokens: number }) => {
      logger.info(agentRecord.teamId, "agent.context_rotation", {
        agentId: data.agentId,
        cumulativeInputTokens: data.cumulativeInputTokens,
      }, data.agentId);

      // Build context summary from DB state
      const summary = buildContextRotationSummary({
        agentId: data.agentId,
        agentName: agentRecord.name,
        teamId: agentRecord.teamId,
        personaId: agentRecord.personaId,
      });

      // Stop current runner gracefully
      runner.stop();

      // Store summary for the next start
      this.pendingContextSummaries.set(data.agentId, summary);

      // Restart agent (picks up pending summary) — NOT an error restart
      await this.startAgent(data.agentId).catch((e) => {
        console.error(`Failed to restart agent ${data.agentId} after context rotation:`, e);
      });
    });

    // Handle errors with exponential backoff restart
    runner.on("error", (err) => {
      console.error(`Agent ${agentId} error:`, err);
      logger.error(agentRecord.teamId, "agent.error", {
        agentId,
        error: err instanceof Error ? err.message : JSON.stringify(err),
      }, agentId);
      entry.failCount++;

      if (entry.failCount >= AGENT_MAX_RESTART_ATTEMPTS) {
        console.error(`Agent ${agentId} exceeded max restarts (${AGENT_MAX_RESTART_ATTEMPTS}), entering error state`);
        updateAgentStatus(agentId, "error");
        this.emit("agent:status", { agentId, status: "error", teamId: agentRecord.teamId });
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at 60s
      const delay = Math.min(
        AGENT_RESTART_BACKOFF_BASE_MS * Math.pow(2, entry.failCount - 1),
        AGENT_RESTART_BACKOFF_MAX_MS
      );

      console.log(`Restarting agent ${agentId} in ${delay}ms (attempt ${entry.failCount})`);
      logger.info(agentRecord.teamId, "agent.restarting", {
        agentId,
        attempt: entry.failCount,
        delayMs: delay,
      }, agentId);
      updateAgentStatus(agentId, "restarting");
      this.emit("agent:status", { agentId, status: "restarting", teamId: agentRecord.teamId });

      entry.restartTimer = setTimeout(() => {
        this.startAgent(agentId).catch((e) => {
          console.error(`Failed to restart agent ${agentId}:`, e);
        });
      }, delay);
    });

    // Reset fail count on successful message stream
    runner.on("text", () => {
      entry.failCount = 0;
    });

    // Subscribe bus messages to feed the agent
    bus.on("message", busListener);

    logger.info(agentRecord.teamId, "agent.started", { agentId, name: agentRecord.name }, agentId);

    // Start the agent (non-blocking)
    runner.start().catch((err) => {
      console.error(`Agent ${agentId} start failed:`, err);
    });
  }

  /**
   * Stop a single agent
   */
  stopAgent(agentId: string): void {
    this.cleanupAgent(agentId);
  }

  /**
   * Restart a single agent
   */
  async restartAgent(agentId: string): Promise<void> {
    this.stopAgent(agentId);
    await new Promise((r) => setTimeout(r, 500));
    await this.startAgent(agentId);
  }

  /**
   * Start all agents for a team
   */
  async startTeam(teamId: string): Promise<void> {
    const team = getTeamById(teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);

    const startedAt = new Date().toISOString();
    this.teamStartedAt.set(teamId, startedAt);

    updateTeam(teamId, { status: "running" });

    const agents = getAgentsByTeam(teamId);
    for (const agent of agents) {
      await this.startAgent(agent.id);
    }

    const logger = getLogger();
    logger.info(teamId, "team.started", { agentCount: agents.length });

    // Start idle monitor if configured
    const config = loadConfig();
    const intervalMinutes = config.idleNudgeIntervalMinutes ?? 15;
    const intervalMs = intervalMinutes > 0
      ? intervalMinutes * 60 * 1000
      : 0;

    if (intervalMs > 0) {
      // Stop any existing monitor for this team
      const existingMonitor = this.idleMonitors.get(teamId);
      if (existingMonitor) existingMonitor.stop();

      const monitor = new IdleMonitor({
        teamId,
        baseIntervalMs: intervalMs || IDLE_NUDGE_DEFAULT_INTERVAL_MS,
        tokenTracker: this.tokenTracker,
        maxBudgetUsd: config.maxBudgetUsd,
        budgetThreshold: config.idleNudgeBudgetThreshold ?? IDLE_NUDGE_DEFAULT_BUDGET_THRESHOLD,
        getNudgeTarget: (nudgeCount: number) => {
          const teamAgents = getAgentsByTeam(teamId);
          const running = teamAgents.filter((a) => {
            const entry = this.agents.get(a.id);
            return entry?.runner.isRunning;
          });
          if (running.length === 0) return null;
          const index = nudgeCount % running.length;
          const a = running[index];
          const entry = this.agents.get(a.id)!;
          return { agentId: a.id, runner: entry.runner };
        },
      });

      monitor.on("idle:nudge", (data) => {
        this.emit("idle:nudge", data);
      });

      this.idleMonitors.set(teamId, monitor);
      monitor.start();
    }

    // Start max runtime timer
    const maxRuntimeMinutes = config.maxRuntimeMinutes ?? 180; // default 3 hours
    this.teamMaxRuntime.set(teamId, maxRuntimeMinutes);
    if (maxRuntimeMinutes > 0) {
      const timer = setTimeout(() => {
        logger.info(teamId, "team.max_runtime_reached", { maxRuntimeMinutes });
        this.stopTeam(teamId);
        this.emit("team:status", { teamId, status: "stopped", reason: "max_runtime" });
      }, maxRuntimeMinutes * 60 * 1000);
      this.runtimeTimers.set(teamId, timer);
    }

    this.emit("team:status", { teamId, status: "running", startedAt, maxRuntimeMinutes });
  }

  /**
   * Stop all agents for a team
   */
  stopTeam(teamId: string): void {
    const logger = getLogger();

    // Clear runtime tracking
    this.teamStartedAt.delete(teamId);
    this.teamMaxRuntime.delete(teamId);
    const runtimeTimer = this.runtimeTimers.get(teamId);
    if (runtimeTimer) {
      clearTimeout(runtimeTimer);
      this.runtimeTimers.delete(teamId);
    }

    // Stop idle monitor
    const monitor = this.idleMonitors.get(teamId);
    if (monitor) {
      monitor.stop();
      this.idleMonitors.delete(teamId);
    }

    const agents = getAgentsByTeam(teamId);
    for (const agent of agents) {
      this.stopAgent(agent.id);
      updateAgentStatus(agent.id, "stopped");
      this.emit("agent:status", { agentId: agent.id, status: "stopped" });
      logger.info(teamId, "agent.stopped", { agentId: agent.id }, agent.id);
    }

    updateTeam(teamId, { status: "stopped" });
    logger.info(teamId, "team.stopped", { agentCount: agents.length });
    this.emit("team:status", { teamId, status: "stopped" });
  }

  /**
   * Send a human message to a team's bus
   */
  sendHumanMessage(teamId: string, channelName: string, content: string): void {
    const bus = this.getBus(teamId);
    bus.post({
      channelName,
      authorId: null,
      authorRole: "human",
      authorName: "Human",
      content,
      messageType: "text",
    });
  }

  /**
   * Get the status of all agents for a team
   */
  getTeamAgentStatuses(teamId: string): Array<{ agentId: string; status: AgentStatus; running: boolean }> {
    const agents = getAgentsByTeam(teamId);
    return agents.map((a) => {
      const entry = this.agents.get(a.id);
      return {
        agentId: a.id,
        status: a.status as AgentStatus,
        running: entry?.runner.isRunning ?? false,
      };
    });
  }

  /**
   * Get runtime info for a team (startedAt, maxRuntimeMinutes)
   */
  getTeamRuntimeInfo(teamId: string): { startedAt: string | null; maxRuntimeMinutes: number | null } {
    return {
      startedAt: this.teamStartedAt.get(teamId) ?? null,
      maxRuntimeMinutes: this.teamMaxRuntime.get(teamId) ?? null,
    };
  }

  /**
   * Shut down everything
   */
  shutdown(): void {
    // Clear all runtime timers
    for (const [, timer] of this.runtimeTimers) {
      clearTimeout(timer);
    }
    this.runtimeTimers.clear();

    // Stop all idle monitors
    for (const [, monitor] of this.idleMonitors) {
      monitor.stop();
    }
    this.idleMonitors.clear();

    const agentIds = [...this.agents.keys()];
    for (const agentId of agentIds) {
      this.cleanupAgent(agentId);
      updateAgentStatus(agentId, "stopped");
    }
    this.buses.clear();
  }

  /**
   * Reset any teams/agents stuck in active states from a previous server session.
   * Should be called once on server startup.
   */
  resetStaleStatuses(): void {
    const teams = getAllTeams();
    for (const team of teams) {
      if (team.status !== "idle" && team.status !== "stopped") {
        updateTeam(team.id, { status: "stopped" });
      }
      const agents = getAgentsByTeam(team.id);
      for (const agent of agents) {
        if (agent.status !== "idle" && agent.status !== "stopped") {
          updateAgentStatus(agent.id, "stopped");
        }
      }
    }
  }
}
