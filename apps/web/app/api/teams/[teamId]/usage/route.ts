import { NextRequest, NextResponse } from "next/server";
import { getUsageByTeam } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const usage = getUsageByTeam(teamId);
  return NextResponse.json(usage ?? { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0 });
}
