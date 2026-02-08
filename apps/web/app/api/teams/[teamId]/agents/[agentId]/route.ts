import { NextRequest, NextResponse } from "next/server";
import { getAgentById, getTeamById, deleteAgent } from "@chiron-os/db";

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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { teamId, agentId } = await context.params;

  const team = getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (team.status === "running") {
    return NextResponse.json({ error: "Stop the team before removing agents" }, { status: 400 });
  }

  const agent = getAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  deleteAgent(agentId);
  return NextResponse.json({ ok: true });
}
