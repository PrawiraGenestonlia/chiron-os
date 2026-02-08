import { NextRequest, NextResponse } from "next/server";
import { getAgentById } from "@chiron-os/db";
import { getLifecycle } from "@/lib/lifecycle";

interface RouteContext {
  params: Promise<{ teamId: string; agentId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { agentId } = await context.params;
  const agent = getAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  try {
    const lifecycle = getLifecycle();
    await lifecycle.restartAgent(agentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
