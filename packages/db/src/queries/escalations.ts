import { eq, and } from "drizzle-orm";
import { db, withTransaction } from "../client.js";
import { escalations } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { EscalationStatus } from "@chiron-os/shared";

export function getEscalationsByTeam(teamId: string) {
  return db.select().from(escalations).where(eq(escalations.teamId, teamId)).all();
}

export function getOpenEscalations(teamId: string) {
  return db
    .select()
    .from(escalations)
    .where(and(eq(escalations.teamId, teamId), eq(escalations.status, "open")))
    .all();
}

export function getEscalationById(id: string) {
  return db.select().from(escalations).where(eq(escalations.id, id)).get();
}

export function createEscalation(data: {
  teamId: string;
  channelId: string;
  messageId?: string;
  reason: string;
  votes?: Record<string, string>;
}) {
  return withTransaction(() => {
    const id = generateId();
    db.insert(escalations)
      .values({
        id,
        teamId: data.teamId,
        channelId: data.channelId,
        messageId: data.messageId ?? null,
        reason: data.reason,
        status: "open",
        votes: data.votes ?? null,
        createdAt: nowISO(),
      })
      .run();
    return getEscalationById(id)!;
  });
}

export function updateEscalationStatus(id: string, status: EscalationStatus, resolution?: string) {
  return withTransaction(() => {
    const update: Record<string, unknown> = { status };
    if (resolution) {
      update.resolution = resolution;
      update.resolvedAt = nowISO();
    }
    db.update(escalations).set(update).where(eq(escalations.id, id)).run();
    return getEscalationById(id);
  });
}
