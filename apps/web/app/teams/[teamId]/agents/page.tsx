import { getAgentsByTeam } from "@chiron-os/db";
import { AgentList } from "@/components/agents/agent-list";
import type { Agent } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function AgentsPage({ params }: PageProps) {
  const { teamId } = await params;
  const agents = getAgentsByTeam(teamId) as Agent[];

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Agents
      </h1>
      <AgentList teamId={teamId} initialAgents={agents} />
    </div>
  );
}
