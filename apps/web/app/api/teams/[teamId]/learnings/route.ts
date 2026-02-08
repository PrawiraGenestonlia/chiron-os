import { NextRequest, NextResponse } from "next/server";
import { getMemoriesByTeam, createMemory } from "@chiron-os/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const memories = getMemoriesByTeam(teamId);
  return NextResponse.json(memories);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const body = await request.json();

  if (!body.category || !body.content) {
    return NextResponse.json(
      { error: "category and content are required" },
      { status: 400 }
    );
  }

  const memory = createMemory({
    teamId,
    agentId: body.agentId,
    category: body.category,
    content: body.content,
  });

  return NextResponse.json(memory, { status: 201 });
}
