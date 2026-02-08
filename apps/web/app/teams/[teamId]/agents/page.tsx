import { getAgentsByTeam, getPersonaById, getTeamById } from "@chiron-os/db";
import { AgentList } from "@/components/agents/agent-list";
import { notFound } from "next/navigation";
import type { Agent } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function AgentsPage({ params }: PageProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();
  const agents = getAgentsByTeam(teamId) as Agent[];

  // Enrich agents with persona info
  const enriched = agents.map((agent) => {
    const persona = getPersonaById(agent.personaId);
    return {
      ...agent,
      personaName: persona?.name,
      personaShortCode: persona?.shortCode,
      personaColor: persona?.color,
    };
  });

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Agents
      </h1>
      <AgentList teamId={teamId} teamStatus={team.status} initialAgents={enriched} />
    </div>
  );
}
