import { NextRequest, NextResponse } from "next/server";
import { getPersonaById, updatePersona, deletePersona } from "@chiron-os/db";

interface RouteContext {
  params: Promise<{ personaId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { personaId } = await context.params;
  const persona = getPersonaById(personaId);
  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }
  return NextResponse.json(persona);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { personaId } = await context.params;
  const persona = getPersonaById(personaId);
  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  const body = await request.json();
  const updated = updatePersona(personaId, body);
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { personaId } = await context.params;
  const persona = getPersonaById(personaId);
  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  if (persona.isDefault) {
    return NextResponse.json({ error: "Cannot delete default personas" }, { status: 400 });
  }

  deletePersona(personaId);
  return NextResponse.json({ ok: true });
}
