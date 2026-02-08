import { NextRequest, NextResponse } from "next/server";
import { getAllTeams, createTeam, createDefaultChannels, createAgent, getPersonaById } from "@chiron-os/db";

export async function GET() {
  const teams = getAllTeams();
  return NextResponse.json(teams);
}

interface MemberSpec {
  personaId: string;
  count: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, goal, members } = body as {
    name?: string;
    goal?: string;
    members?: MemberSpec[];
  };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!members || !Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: "At least one team member is required" }, { status: 400 });
  }

  const team = createTeam({ name, goal });
  createDefaultChannels(team.id);

  // Create agents for each member spec
  const createdAgents = [];
  for (const member of members) {
    const persona = getPersonaById(member.personaId);
    if (!persona) continue;

    const count = Math.max(1, Math.min(member.count, 10)); // clamp 1-10
    for (let i = 1; i <= count; i++) {
      const agentName = count === 1
        ? `${persona.shortCode.toUpperCase()}-1`
        : `${persona.shortCode.toUpperCase()}-${i}`;
      const agent = createAgent({
        teamId: team.id,
        personaId: member.personaId,
        name: agentName,
      });
      createdAgents.push(agent);
    }
  }

  return NextResponse.json({ ...team, agents: createdAgents }, { status: 201 });
}
