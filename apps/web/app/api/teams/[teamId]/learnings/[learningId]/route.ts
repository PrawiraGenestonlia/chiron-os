import { NextRequest, NextResponse } from "next/server";
import { deleteMemory, getMemoryById } from "@chiron-os/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; learningId: string }> }
) {
  const { learningId } = await params;

  const memory = getMemoryById(learningId);
  if (!memory) {
    return NextResponse.json({ error: "Learning not found" }, { status: 404 });
  }

  deleteMemory(learningId);
  return NextResponse.json({ ok: true });
}
