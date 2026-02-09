import { NextRequest, NextResponse } from "next/server";
import { getLogsByTeam } from "@chiron-os/db";
import type { LogLevel } from "@chiron-os/shared";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(request.url);

  const level = searchParams.get("level") as LogLevel | null;
  const agentId = searchParams.get("agentId") ?? undefined;
  const event = searchParams.get("event") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const logs = getLogsByTeam(teamId, {
    level: level ?? undefined,
    agentId,
    event,
    limit: Math.min(limit, 500),
    offset,
  });

  return NextResponse.json(logs);
}
