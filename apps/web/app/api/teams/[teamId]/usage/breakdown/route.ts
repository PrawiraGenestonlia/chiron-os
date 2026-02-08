import { NextRequest, NextResponse } from "next/server";
import { getUsageBreakdown, getAgentById } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const breakdown = getUsageBreakdown(teamId);

  // Enrich with agent names
  const enriched = breakdown.map((entry) => {
    const agent = getAgentById(entry.agentId);
    return { ...entry, agentName: agent?.name ?? entry.agentId.slice(0, 8) };
  });

  return NextResponse.json(enriched);
}
