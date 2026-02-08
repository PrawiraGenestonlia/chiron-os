import { NextRequest, NextResponse } from "next/server";
import { getUsageBreakdown } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const breakdown = getUsageBreakdown(teamId);
  return NextResponse.json(breakdown);
}
