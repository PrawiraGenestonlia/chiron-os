import { recordTokenUsage, getUsageByTeam, getUsageByAgent, getUsageBreakdown } from "@chiron-os/db";
import { EventEmitter } from "node:events";
import { getLogger } from "../logging/logger.js";

export interface UsageEntry {
  agentId: string;
  teamId: string;
  taskId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class TokenTracker extends EventEmitter {
  private maxBudgetUsd?: number;

  setMaxBudget(maxBudgetUsd: number | undefined): void {
    this.maxBudgetUsd = maxBudgetUsd;
  }

  record(entry: UsageEntry): { recorded: boolean; budgetExceeded: boolean } {
    recordTokenUsage({
      agentId: entry.agentId,
      teamId: entry.teamId,
      taskId: entry.taskId,
      model: entry.model,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      costUsd: entry.costUsd,
    });

    const logger = getLogger();
    logger.debug(entry.teamId, "token.recorded", {
      agentId: entry.agentId,
      model: entry.model,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      costUsd: entry.costUsd,
    }, entry.agentId);

    this.emit("usage", entry);

    // Check budget
    if (this.maxBudgetUsd !== undefined) {
      const teamUsage = getUsageByTeam(entry.teamId);
      const totalCost = teamUsage?.totalCostUsd ?? 0;

      // Budget warning at 80%
      if (totalCost >= this.maxBudgetUsd * 0.8 && totalCost < this.maxBudgetUsd) {
        logger.warn(entry.teamId, "budget.warning", {
          totalCost,
          maxBudget: this.maxBudgetUsd,
          percentUsed: Math.round((totalCost / this.maxBudgetUsd) * 100),
        });
      }

      if (totalCost >= this.maxBudgetUsd) {
        logger.error(entry.teamId, "budget.exceeded", {
          totalCost,
          maxBudget: this.maxBudgetUsd,
        });
        this.emit("budget:exceeded", {
          teamId: entry.teamId,
          totalCost,
          maxBudget: this.maxBudgetUsd,
        });
        return { recorded: true, budgetExceeded: true };
      }
    }

    return { recorded: true, budgetExceeded: false };
  }

  getTeamUsage(teamId: string) {
    return getUsageByTeam(teamId);
  }

  getAgentUsage(agentId: string) {
    return getUsageByAgent(agentId);
  }

  getBreakdown(teamId: string) {
    return getUsageBreakdown(teamId);
  }
}
