import { NextRequest, NextResponse } from "next/server";
import { getTeamById, updateTeam, deleteTeam } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const team = getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json(team);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const team = getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body = await request.json();
  const updated = updateTeam(teamId, body);
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const team = getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Stop all running agents before deleting the team
  const lifecycle = (globalThis as Record<string, unknown>).__chiron_lifecycle as
    | { stopTeam: (id: string) => void }
    | undefined;
  if (lifecycle) {
    lifecycle.stopTeam(teamId);
  }

  deleteTeam(teamId);
  return NextResponse.json({ ok: true });
}
