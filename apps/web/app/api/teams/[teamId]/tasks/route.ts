import { NextRequest, NextResponse } from "next/server";
import { getTasksByTeam, createTask } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const tasks = getTasksByTeam(teamId);
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = createTask({
    teamId,
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    assigneeId: body.assigneeId,
  });

  // Broadcast to WebSocket subscribers
  const broadcastFn = (globalThis as Record<string, unknown>).__chiron_broadcast as
    | ((teamId: string, event: unknown) => void)
    | undefined;
  if (broadcastFn) {
    broadcastFn(teamId, { type: "task:created", data: task });
  }

  return NextResponse.json(task, { status: 201 });
}
