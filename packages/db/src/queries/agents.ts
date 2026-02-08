import { eq, and } from "drizzle-orm";
import { db } from "../client.js";
import { agents } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { AgentCreate, AgentStatus } from "@chiron-os/shared";

export function getAgentsByTeam(teamId: string) {
  return db.select().from(agents).where(eq(agents.teamId, teamId)).all();
}

export function getAgentById(id: string) {
  return db.select().from(agents).where(eq(agents.id, id)).get();
}

export function createAgent(data: AgentCreate) {
  const now = nowISO();
  const id = generateId();
  db.insert(agents)
    .values({
      id,
      teamId: data.teamId,
      personaId: data.personaId,
      name: data.name,
      modelOverride: data.modelOverride ?? null,
      status: "idle",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getAgentById(id)!;
}

export function updateAgentStatus(id: string, status: AgentStatus, sessionId?: string) {
  const update: Record<string, unknown> = { status, updatedAt: nowISO() };
  if (sessionId !== undefined) {
    update.sessionId = sessionId;
  }
  db.update(agents).set(update).where(eq(agents.id, id)).run();
  return getAgentById(id);
}

export function getRunningAgentsByTeam(teamId: string) {
  return db
    .select()
    .from(agents)
    .where(and(eq(agents.teamId, teamId), eq(agents.status, "running")))
    .all();
}
