import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { teams } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { TeamCreate, TeamUpdate } from "@chiron-os/shared";

export function getAllTeams() {
  return db.select().from(teams).all();
}

export function getTeamById(id: string) {
  return db.select().from(teams).where(eq(teams.id, id)).get();
}

export function createTeam(data: TeamCreate) {
  const now = nowISO();
  const id = generateId();
  db.insert(teams)
    .values({
      id,
      name: data.name,
      goal: data.goal ?? null,
      status: "idle",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getTeamById(id)!;
}

export function updateTeam(id: string, data: TeamUpdate) {
  db.update(teams)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(teams.id, id))
    .run();
  return getTeamById(id);
}

export function deleteTeam(id: string) {
  db.delete(teams).where(eq(teams.id, id)).run();
}
