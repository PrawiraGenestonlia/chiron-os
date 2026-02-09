import { eq, and, desc, lt } from "drizzle-orm";
import { db, withTransaction } from "../client.js";
import { logs } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { LogLevel, LogEvent } from "@chiron-os/shared";

const MAX_LOGS_PER_TEAM = 10_000;

export function createLog(data: {
  teamId: string;
  agentId?: string | null;
  level: LogLevel;
  event: LogEvent;
  data?: Record<string, unknown> | null;
  latencyMs?: number | null;
}) {
  return withTransaction(() => {
    const id = generateId();
    db.insert(logs)
      .values({
        id,
        teamId: data.teamId,
        agentId: data.agentId ?? null,
        level: data.level,
        event: data.event,
        data: data.data ?? null,
        latencyMs: data.latencyMs ?? null,
        createdAt: nowISO(),
      })
      .run();
    return getLogById(id)!;
  });
}

export function getLogById(id: string) {
  return db.select().from(logs).where(eq(logs.id, id)).get();
}

export function getLogsByTeam(
  teamId: string,
  filters?: {
    level?: LogLevel;
    agentId?: string;
    event?: string;
    limit?: number;
    offset?: number;
  }
) {
  const limit = filters?.limit ?? 100;
  const offset = filters?.offset ?? 0;

  const conditions = [eq(logs.teamId, teamId)];
  if (filters?.level) {
    conditions.push(eq(logs.level, filters.level));
  }
  if (filters?.agentId) {
    conditions.push(eq(logs.agentId, filters.agentId));
  }
  if (filters?.event) {
    conditions.push(eq(logs.event, filters.event));
  }

  return db
    .select()
    .from(logs)
    .where(and(...conditions))
    .orderBy(desc(logs.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function evictOldLogs(teamId: string) {
  const count = db
    .select({ id: logs.id })
    .from(logs)
    .where(eq(logs.teamId, teamId))
    .all().length;

  if (count <= MAX_LOGS_PER_TEAM) return 0;

  const toDelete = count - MAX_LOGS_PER_TEAM;

  // Find the cutoff timestamp
  const oldest = db
    .select({ createdAt: logs.createdAt })
    .from(logs)
    .where(eq(logs.teamId, teamId))
    .orderBy(logs.createdAt)
    .limit(1)
    .offset(toDelete - 1)
    .get();

  if (!oldest) return 0;

  db.delete(logs)
    .where(and(eq(logs.teamId, teamId), lt(logs.createdAt, oldest.createdAt)))
    .run();

  return toDelete;
}
