import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { channels } from "../schema/index.js";
import { generateId, nowISO, DEFAULT_CHANNELS } from "@chiron-os/shared";
import type { ChannelType } from "@chiron-os/shared";

export function getChannelsByTeam(teamId: string) {
  return db.select().from(channels).where(eq(channels.teamId, teamId)).all();
}

export function getChannelById(id: string) {
  return db.select().from(channels).where(eq(channels.id, id)).get();
}

export function createChannel(teamId: string, name: string, type: ChannelType, topic?: string) {
  const id = generateId();
  db.insert(channels)
    .values({
      id,
      teamId,
      name,
      type,
      topic: topic ?? null,
      createdAt: nowISO(),
    })
    .run();
  return getChannelById(id)!;
}

export function createDefaultChannels(teamId: string) {
  return DEFAULT_CHANNELS.map((ch) => createChannel(teamId, ch.name, ch.type, ch.topic));
}
