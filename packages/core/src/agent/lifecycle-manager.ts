import { EventEmitter } from "node:events";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { AgentRunner, type AgentRunnerConfig } from "./agent-runner.js";
import { MessageBus } from "../bus/message-bus.js";
import { TokenTracker } from "../tracking/token-tracker.js";
import {
  getAgentsByTeam,
  getTeamById,
  updateTeam,
  updateAgentStatus,
  createAgent,
} from "@chiron-os/db";
import { EscalationManager } from "../escalation/escalation-manager.js";
import { loadConfig, AGENT_MAX_RESTART_ATTEMPTS, AGENT_RESTART_BACKOFF_BASE_MS, AGENT_RESTART_BACKOFF_MAX_MS } from "@chiron-os/shared";
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
  private tokenTracker = new TokenTracker();
  private escalationManager?: EscalationManager;

  constructor() {
    super();
    // Wire budget config
    const config = loadConfig(process.cwd());
    if (config.maxBudgetUsd) {
      this.tokenTracker.setMaxBudget(config.maxBudgetUsd);
    }
    // Listen for budget exceeded and stop the team
    this.tokenTracker.on("budget:exceeded", (data: { teamId: string; totalCost: number; maxBudget: number }) => {
      console.warn(`Budget exceeded for team ${data.teamId}: $${data.totalCost.toFixed(2)} >= $${data.maxBudget}`);
      this.stopTeam(data.teamId);
    });
  }

  setEscalationManager(em: EscalationManager): void {
    this.escalationManager = em;
  }

  /**
   * Find the project root by walking up to find .chiron/ or chiron.config.json
   */
  private findProjectRoot(): string {
    let dir = process.cwd();
    while (true) {
      if (existsSync(join(dir, ".chiron")) || existsSync(join(dir, "chiron.config.json"))) {
        return dir;
      }
      const parent = dirname(dir);
      if (parent === dir) return process.cwd();
      dir = parent;
    }
  }

  /**
   * Get the workspace directory for a team. Creates it if it doesn't exist.
   */
  private ensureWorkspace(teamId: string): string {
    const root = this.findProjectRoot();
    const workspaceDir = join(root, ".chiron", "workspaces", teamId);
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
      // Re-emit bus messages for WebSocket broadcasting
      bus.on("message", (message) => {
        this.emit("bus:message", { teamId, message });
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
      onStatusChange: (id, status) => {
        this.emit("agent:status", { agentId: id, status, teamId: agentRecord.teamId });
      },
      onStream: (id, chunk) => {
        this.emit("agent:stream", { agentId: id, chunk, teamId: agentRecord.teamId });
      },
    };

    const runner = new AgentRunner(config);

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

    // Handle errors with exponential backoff restart
    runner.on("error", (err) => {
      console.error(`Agent ${agentId} error:`, err);
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

    updateTeam(teamId, { status: "running" });

    const agents = getAgentsByTeam(teamId);
    for (const agent of agents) {
      await this.startAgent(agent.id);
    }

    this.emit("team:status", { teamId, status: "running" });
  }

  /**
   * Stop all agents for a team
   */
  stopTeam(teamId: string): void {
    const agents = getAgentsByTeam(teamId);
    for (const agent of agents) {
      this.stopAgent(agent.id);
    }

    updateTeam(teamId, { status: "stopped" });
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
   * Shut down everything
   */
  shutdown(): void {
    const agentIds = [...this.agents.keys()];
    for (const agentId of agentIds) {
      this.cleanupAgent(agentId);
    }
    this.buses.clear();
  }
}
