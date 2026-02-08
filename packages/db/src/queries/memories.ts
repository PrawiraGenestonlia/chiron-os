import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { memories } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";

export function createMemory(data: {
  teamId: string;
  agentId?: string;
  category: string;
  content: string;
}) {
  const id = generateId();
  db.insert(memories)
    .values({
      id,
      teamId: data.teamId,
      agentId: data.agentId ?? null,
      category: data.category,
      content: data.content,
      createdAt: nowISO(),
    })
    .run();
  return getMemoryById(id)!;
}

export function getMemoriesByTeam(teamId: string, category?: string) {
  const rows = db.select().from(memories).where(eq(memories.teamId, teamId)).all();
  if (category) {
    return rows.filter((r) => r.category === category);
  }
  return rows;
}

export function getMemoryById(id: string) {
  return db.select().from(memories).where(eq(memories.id, id)).get();
}

export function deleteMemory(id: string) {
  db.delete(memories).where(eq(memories.id, id)).run();
}
