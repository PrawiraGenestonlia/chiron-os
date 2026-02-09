import { eq, desc, and, isNull, lt, like } from "drizzle-orm";
import { db, withTransaction } from "../client.js";
import { messages, channels } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { MessageCreate } from "@chiron-os/shared";

export function getMessagesByChannel(
  channelId: string,
  opts: { limit?: number; before?: string } = {}
) {
  const limit = opts.limit ?? 50;
  const conditions = [eq(messages.channelId, channelId), isNull(messages.threadId)];

  if (opts.before) {
    conditions.push(lt(messages.createdAt, opts.before));
  }

  const query = db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return query.all().reverse();
}

export function getThreadMessages(threadId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt)
    .all();
}

export function getMessageById(id: string) {
  return db.select().from(messages).where(eq(messages.id, id)).get();
}

export function getRecentMessagesByTeam(teamId: string, limit = 10) {
  return db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      authorId: messages.authorId,
      authorRole: messages.authorRole,
      authorName: messages.authorName,
      threadId: messages.threadId,
      content: messages.content,
      messageType: messages.messageType,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      channelName: channels.name,
    })
    .from(messages)
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .where(eq(channels.teamId, teamId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all()
    .reverse();
}

export function searchMessages(
  teamId: string,
  query: string,
  channelId?: string,
  limit = 50
) {
  const conditions = [
    eq(channels.teamId, teamId),
    like(messages.content, `%${query}%`),
  ];
  if (channelId) {
    conditions.push(eq(messages.channelId, channelId));
  }
  return db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      authorId: messages.authorId,
      authorRole: messages.authorRole,
      authorName: messages.authorName,
      threadId: messages.threadId,
      content: messages.content,
      messageType: messages.messageType,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all()
    .reverse();
}

export function createMessage(data: MessageCreate) {
  return withTransaction(() => {
    const id = generateId();
    db.insert(messages)
      .values({
        id,
        channelId: data.channelId,
        authorId: data.authorId ?? null,
        authorRole: data.authorRole,
        authorName: data.authorName ?? null,
        threadId: data.threadId ?? null,
        content: data.content,
        messageType: data.messageType,
        metadata: data.metadata ?? null,
        createdAt: nowISO(),
      })
      .run();
    return getMessageById(id)!;
  });
}
