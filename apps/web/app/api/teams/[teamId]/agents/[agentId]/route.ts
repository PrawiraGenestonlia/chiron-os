import { NextRequest, NextResponse } from "next/server";
import { getAgentById } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string; agentId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { agentId } = await context.params;
  const agent = getAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json(agent);
}
