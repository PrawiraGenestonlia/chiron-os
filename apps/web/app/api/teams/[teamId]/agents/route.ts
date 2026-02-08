import { NextRequest, NextResponse } from "next/server";
import { getAgentsByTeam } from "@chiron-os/db";
import { MAX_AGENTS_PER_TEAM } from "@chiron-os/shared";
import { getLifecycle } from "@/lib/lifecycle";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const agents = getAgentsByTeam(teamId);
  return NextResponse.json(agents);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const body = await request.json();
  const { personaId, name, modelOverride } = body;

  if (!personaId || !name) {
    return NextResponse.json(
      { error: "personaId and name are required" },
      { status: 400 }
    );
  }

  const existing = getAgentsByTeam(teamId);
  if (existing.length >= MAX_AGENTS_PER_TEAM) {
    return NextResponse.json(
      { error: `Maximum ${MAX_AGENTS_PER_TEAM} agents per team` },
      { status: 400 }
    );
  }

  try {
    const lifecycle = getLifecycle();
    const agent = lifecycle.addAgent({ teamId, personaId, name, modelOverride });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
