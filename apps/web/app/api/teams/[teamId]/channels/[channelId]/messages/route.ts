import { NextRequest, NextResponse } from "next/server";
import { getMessagesByChannel, createMessage } from "@chiron-os/db";
import { getChannelById } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string; channelId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { channelId } = await context.params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const before = url.searchParams.get("before") ?? undefined;

  const messages = getMessagesByChannel(channelId, { limit, before });
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId, channelId } = await context.params;
  const body = await request.json();

  if (!body.content || !body.authorRole) {
    return NextResponse.json({ error: "content and authorRole are required" }, { status: 400 });
  }

  // If this is a human message, route through the lifecycle manager's bus
  // so agents receive it via their bus listeners
  if (body.authorRole === "human") {
    const lifecycle = (globalThis as Record<string, unknown>).__chiron_lifecycle as
      | { sendHumanMessage: (teamId: string, channelName: string, content: string) => void }
      | undefined;

    if (lifecycle) {
      // Look up channel name from ID
      const channel = getChannelById(channelId);
      if (channel) {
        lifecycle.sendHumanMessage(teamId, channel.name, body.content);
        // sendHumanMessage already creates the message via bus.post, so return the latest
        const messages = getMessagesByChannel(channelId, { limit: 1 });
        const latest = messages[messages.length - 1];
        return NextResponse.json(latest, { status: 201 });
      }
    }
  }

  // Fallback: direct DB insert (agents won't see it)
  const message = createMessage({
    channelId,
    authorId: body.authorId ?? null,
    authorRole: body.authorRole,
    authorName: body.authorName,
    content: body.content,
    messageType: body.messageType ?? "text",
    threadId: body.threadId,
    metadata: body.metadata,
  });

  // Broadcast to WebSocket subscribers
  const broadcastFn = (globalThis as Record<string, unknown>).__chiron_broadcast as
    | ((teamId: string, event: unknown) => void)
    | undefined;
  if (broadcastFn) {
    broadcastFn(teamId, { type: "message:new", data: message });
  }

  return NextResponse.json(message, { status: 201 });
}
