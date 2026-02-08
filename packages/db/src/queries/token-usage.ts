import { eq, sql } from "drizzle-orm";
import { db } from "../client.js";
import { tokenUsage } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";

export interface TokenUsageRecord {
  agentId: string;
  teamId: string;
  taskId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function recordTokenUsage(data: TokenUsageRecord) {
  const id = generateId();
  db.insert(tokenUsage)
    .values({
      id,
      agentId: data.agentId,
      teamId: data.teamId,
      taskId: data.taskId ?? null,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      costUsd: data.costUsd,
      createdAt: nowISO(),
    })
    .run();
}

export function getUsageByTeam(teamId: string) {
  return db
    .select({
      totalInputTokens: sql<number>`sum(${tokenUsage.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${tokenUsage.outputTokens})`,
      totalCostUsd: sql<number>`sum(${tokenUsage.costUsd})`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.teamId, teamId))
    .get();
}

export function getUsageByAgent(agentId: string) {
  return db
    .select({
      totalInputTokens: sql<number>`sum(${tokenUsage.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${tokenUsage.outputTokens})`,
      totalCostUsd: sql<number>`sum(${tokenUsage.costUsd})`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.agentId, agentId))
    .get();
}

export function getUsageBreakdown(teamId: string) {
  return db
    .select({
      agentId: tokenUsage.agentId,
      model: tokenUsage.model,
      totalInputTokens: sql<number>`sum(${tokenUsage.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${tokenUsage.outputTokens})`,
      totalCostUsd: sql<number>`sum(${tokenUsage.costUsd})`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.teamId, teamId))
    .groupBy(tokenUsage.agentId, tokenUsage.model)
    .all();
}
