import { NextResponse } from "next/server";
import { getDeploymentsByTeam } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { teamId } = await context.params;
  const deployments = getDeploymentsByTeam(teamId);
  return NextResponse.json(deployments);
}
