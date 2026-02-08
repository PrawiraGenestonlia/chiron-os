import { NextRequest, NextResponse } from "next/server";
import { getEscalationById } from "@chiron-os/db";
import type { EscalationManager } from "@chiron-os/core";

interface RouteContext {
  params: Promise<{ teamId: string; escalationId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId, escalationId } = await context.params;
  const body = await request.json();

  if (!body.resolution) {
    return NextResponse.json({ error: "resolution is required" }, { status: 400 });
  }

  const existing = getEscalationById(escalationId);
  if (!existing) {
    return NextResponse.json({ error: "Escalation not found" }, { status: 404 });
  }

  // Use EscalationManager so events are properly emitted
  const escalationManager = (globalThis as Record<string, unknown>).__chiron_escalation as
    | EscalationManager
    | undefined;

  if (escalationManager) {
    const updated = escalationManager.resolve(escalationId, body.resolution);
    return NextResponse.json(updated);
  }

  // Fallback: direct DB update (events won't fire)
  const { updateEscalationStatus } = await import("@chiron-os/db");
  const updated = updateEscalationStatus(escalationId, "resolved", body.resolution);

  const broadcastFn = (globalThis as Record<string, unknown>).__chiron_broadcast as
    | ((teamId: string, event: unknown) => void)
    | undefined;
  if (broadcastFn) {
    broadcastFn(teamId, { type: "escalation:resolved", data: updated });
  }

  return NextResponse.json(updated);
}
