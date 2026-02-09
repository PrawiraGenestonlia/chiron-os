import { eq } from "drizzle-orm";
import { db, withTransaction } from "../client.js";
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
  return withTransaction(() => {
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
  });
}

export function createDefaultChannels(teamId: string) {
  return withTransaction(() => {
    return DEFAULT_CHANNELS.map((ch) => {
      const id = generateId();
      db.insert(channels)
        .values({
          id,
          teamId,
          name: ch.name,
          type: ch.type,
          topic: ch.topic ?? null,
          createdAt: nowISO(),
        })
        .run();
      return getChannelById(id)!;
    });
  });
}
