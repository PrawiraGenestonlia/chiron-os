import { NextRequest, NextResponse } from "next/server";
import { getTeamById } from "@chiron-os/db";
import { getLifecycle } from "@/lib/lifecycle";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const team = getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  try {
    const lifecycle = getLifecycle();
    await lifecycle.startTeam(teamId);
    return NextResponse.json({ ok: true, status: "running" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
