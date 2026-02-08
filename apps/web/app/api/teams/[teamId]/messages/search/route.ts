import { NextRequest, NextResponse } from "next/server";
import { searchMessages } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const channelId = searchParams.get("channelId") ?? undefined;

  if (!q || !q.trim()) {
    return NextResponse.json([]);
  }

  const results = searchMessages(teamId, q.trim(), channelId);
  return NextResponse.json(results);
}
