import { EventEmitter } from "node:events";
import { createMessage, getMessagesByChannel, getChannelsByTeam } from "@chiron-os/db";
import type { Message, MessageCreate } from "@chiron-os/shared";

export interface MessageBusEvents {
  message: (message: Message) => void;
}

export class MessageBus extends EventEmitter {
  private teamId: string;

  constructor(teamId: string) {
    super();
    this.teamId = teamId;
  }

  post(data: Omit<MessageCreate, "channelId"> & { channelId?: string; channelName?: string }): Message {
    let channelId = data.channelId;

    if (!channelId && data.channelName) {
      const channels = getChannelsByTeam(this.teamId);
      const found = channels.find((c) => c.name === data.channelName);
      if (found) {
        channelId = found.id;
      }
    }

    if (!channelId) {
      throw new Error(`Channel not found for team ${this.teamId}`);
    }

    const row = createMessage({
      channelId,
      authorId: data.authorId,
      authorRole: data.authorRole,
      authorName: data.authorName,
      content: data.content,
      messageType: data.messageType,
      threadId: data.threadId,
      metadata: data.metadata,
    });

    const message = row as Message;
    // Include channelName in the emitted event so listeners can use it
    this.emit("message", { ...message, channelName: data.channelName });
    return message;
  }

  query(channelId: string, opts?: { limit?: number }): Message[] {
    return getMessagesByChannel(channelId, { limit: opts?.limit ?? 50 }) as Message[];
  }

  getChannels() {
    return getChannelsByTeam(this.teamId);
  }

  findChannelByName(name: string) {
    const channels = getChannelsByTeam(this.teamId);
    return channels.find((c) => c.name === name);
  }
}
