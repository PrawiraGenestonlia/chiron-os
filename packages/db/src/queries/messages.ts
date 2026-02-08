import { eq, desc, and, isNull, lt } from "drizzle-orm";
import { db } from "../client.js";
import { messages } from "../schema/index.js";
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

export function createMessage(data: MessageCreate) {
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
}
