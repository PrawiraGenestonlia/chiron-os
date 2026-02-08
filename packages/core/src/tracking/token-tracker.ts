import { recordTokenUsage, getUsageByTeam, getUsageByAgent, getUsageBreakdown } from "@chiron-os/db";
import { EventEmitter } from "node:events";

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

    this.emit("usage", entry);

    // Check budget
    if (this.maxBudgetUsd !== undefined) {
      const teamUsage = getUsageByTeam(entry.teamId);
      const totalCost = teamUsage?.totalCostUsd ?? 0;

      if (totalCost >= this.maxBudgetUsd) {
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
