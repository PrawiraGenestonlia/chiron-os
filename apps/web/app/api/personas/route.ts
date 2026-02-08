import { NextRequest, NextResponse } from "next/server";
import { getAllPersonas, createPersona } from "@chiron-os/db";

export async function GET() {
  const personas = getAllPersonas();
  return NextResponse.json(personas);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { shortCode, name, description, basePrompt, icon, color } = body;

  if (!shortCode || !name || !description || !basePrompt) {
    return NextResponse.json(
      { error: "shortCode, name, description, and basePrompt are required" },
      { status: 400 }
    );
  }

  const persona = createPersona({
    shortCode,
    name,
    description,
    basePrompt,
    icon: icon ?? "bot",
    color: color ?? "#6B7280",
  });

  return NextResponse.json(persona, { status: 201 });
}
