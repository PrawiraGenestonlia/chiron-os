import { NextRequest, NextResponse } from "next/server";
import { getEscalationsByTeam, getOpenEscalations } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(request.url);
  const openOnly = searchParams.get("open") === "true";

  const escalations = openOnly
    ? getOpenEscalations(teamId)
    : getEscalationsByTeam(teamId);

  return NextResponse.json(escalations);
}
