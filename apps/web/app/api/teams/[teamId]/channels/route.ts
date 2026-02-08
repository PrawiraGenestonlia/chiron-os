import { NextRequest, NextResponse } from "next/server";
import { getChannelsByTeam, createChannel } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const channels = getChannelsByTeam(teamId);
  return NextResponse.json(channels);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const body = await request.json();
  const { name, type, topic } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  const channel = createChannel(teamId, name, type, topic);
  return NextResponse.json(channel, { status: 201 });
}
