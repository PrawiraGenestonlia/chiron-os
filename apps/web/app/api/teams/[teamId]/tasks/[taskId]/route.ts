import { NextRequest, NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ teamId: string; taskId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { taskId } = await context.params;
  const task = getTaskById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { teamId, taskId } = await context.params;
  const task = getTaskById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const updated = updateTask(taskId, body);

  // Broadcast to WebSocket subscribers
  const broadcastFn = (globalThis as Record<string, unknown>).__chiron_broadcast as
    | ((teamId: string, event: unknown) => void)
    | undefined;
  if (broadcastFn) {
    broadcastFn(teamId, { type: "task:updated", data: updated });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { taskId } = await context.params;
  const task = getTaskById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  deleteTask(taskId);
  return NextResponse.json({ ok: true });
}
