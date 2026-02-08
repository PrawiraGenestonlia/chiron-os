import { EventEmitter } from "node:events";
import {
  IDLE_NUDGE_MAX_INTERVAL_MS,
  IDLE_NUDGE_OBSERVATION_WINDOW_MS,
  IDLE_NUDGE_MAX_FRUITLESS,
} from "@chiron-os/shared";
import type { TokenTracker } from "../tracking/token-tracker.js";
import type { AgentRunner } from "./agent-runner.js";

export interface IdleMonitorConfig {
  teamId: string;
  baseIntervalMs: number;
  tokenTracker: TokenTracker;
  maxBudgetUsd?: number;
  budgetThreshold: number;
  getNudgeTarget: () => { agentId: string; runner: AgentRunner } | null;
}

export type IdleMonitorStatus = "active" | "backed_off" | "hibernating";

const NUDGE_MESSAGE = `[System: Idle Check] The team has been idle. Act like a real PM — don't wait for instructions.

1. Review the project: call list_tasks, read workspace files, check what's been built
2. Think about what a real product team would do next:
   - What features would make users love this product?
   - What's the UX like? Are there rough edges to polish?
   - Is the code well-tested? Would a real team ship this as-is?
   - Is the documentation clear enough for a new developer?
   - Are there obvious improvements that a user would expect?
3. If you have access to external MCP tools (analytics, etc.), use them to understand usage patterns
4. Save any important insights using save_learning for the team's future reference
5. If you identify meaningful improvements, create tasks in #planning and coordinate the team
6. If the product is genuinely complete and polished, stay silent

Be a proactive PM — propose features, drive quality, iterate on the product. But don't create busywork or burn tokens on trivial changes.`;

export class IdleMonitor extends EventEmitter {
  private config: IdleMonitorConfig;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private observationTimer: ReturnType<typeof setTimeout> | null = null;
  private waitingForFirstMessage = true;
  private nudgeCount = 0;
  private fruitlessCount = 0;
  private inObservation = false;
  private observationSawActivity = false;
  private hibernating = false;
  private stopped = false;

  constructor(config: IdleMonitorConfig) {
    super();
    this.config = config;
  }

  get status(): IdleMonitorStatus {
    if (this.hibernating) return "hibernating";
    if (this.fruitlessCount > 0) return "backed_off";
    return "active";
  }

  start(): void {
    this.stopped = false;
    this.waitingForFirstMessage = true;
  }

  recordActivity(): void {
    if (this.stopped) return;

    // During observation window, mark as fruitful
    if (this.inObservation) {
      this.observationSawActivity = true;
    }

    if (this.waitingForFirstMessage) {
      this.waitingForFirstMessage = false;
      this.scheduleIdleCheck();
      return;
    }

    this.scheduleIdleCheck();
  }

  recordHumanActivity(): void {
    if (this.stopped) return;

    // Human message wakes from hibernation and resets fruitless count
    if (this.hibernating) {
      this.hibernating = false;
      this.fruitlessCount = 0;
    }

    this.recordActivity();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.observationTimer) {
      clearTimeout(this.observationTimer);
      this.observationTimer = null;
    }
    this.inObservation = false;
  }

  private getCurrentInterval(): number {
    const interval = this.config.baseIntervalMs * Math.pow(2, this.fruitlessCount);
    return Math.min(interval, IDLE_NUDGE_MAX_INTERVAL_MS);
  }

  private scheduleIdleCheck(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.hibernating || this.stopped) return;

    const interval = this.getCurrentInterval();
    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, interval);
  }

  private handleIdleTimeout(): void {
    if (this.stopped || this.hibernating) return;

    // Don't send another nudge while observing the result of the previous one
    if (this.inObservation) {
      return;
    }

    // Check budget threshold
    if (this.config.maxBudgetUsd && this.config.maxBudgetUsd > 0) {
      const usage = this.config.tokenTracker.getTeamUsage(this.config.teamId);
      const teamCost = usage?.totalCostUsd ?? 0;
      const threshold = this.config.budgetThreshold * this.config.maxBudgetUsd;
      if (teamCost >= threshold) {
        // Over budget threshold — skip this nudge and reschedule
        this.scheduleIdleCheck();
        return;
      }
    }

    // Check fruitless count — hibernate if too many
    if (this.fruitlessCount >= IDLE_NUDGE_MAX_FRUITLESS) {
      this.hibernating = true;
      this.emitStatus();
      return;
    }

    // Find a target agent to nudge
    const target = this.config.getNudgeTarget();
    if (!target) {
      // No running agents — reschedule
      this.scheduleIdleCheck();
      return;
    }

    // Send the nudge
    this.nudgeCount++;
    target.runner.enqueueMessage(NUDGE_MESSAGE);

    // Start observation window
    this.inObservation = true;
    this.observationSawActivity = false;
    this.observationTimer = setTimeout(() => {
      this.inObservation = false;
      if (this.observationSawActivity) {
        // Fruitful — reset backoff
        this.fruitlessCount = 0;
      } else {
        // Fruitless — increase backoff
        this.fruitlessCount++;
      }

      this.emitStatus();

      if (!this.stopped && !this.hibernating) {
        this.scheduleIdleCheck();
      }
    }, IDLE_NUDGE_OBSERVATION_WINDOW_MS);

    this.emitStatus();
  }

  private emitStatus(): void {
    let nextNudgeAt: string | null = null;
    if (!this.hibernating && !this.stopped) {
      const interval = this.getCurrentInterval();
      nextNudgeAt = new Date(Date.now() + interval).toISOString();
    }

    this.emit("idle:nudge", {
      teamId: this.config.teamId,
      nudgeCount: this.nudgeCount,
      nextNudgeAt,
      status: this.status,
    });
  }
}
