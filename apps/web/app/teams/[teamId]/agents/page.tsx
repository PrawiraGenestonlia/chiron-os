import Link from "next/link";
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
    <div className="p-8 max-w-5xl mx-auto">
      <Link href={`/teams/${teamId}`} className="text-sm mb-4 inline-block transition-colors hover:underline" style={{ color: "var(--muted-foreground)" }}>
        &larr; Back to Team
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ color: "var(--foreground)" }}>
        Agents
      </h1>
      <AgentList teamId={teamId} initialAgents={agents} />
    </div>
  );
}
