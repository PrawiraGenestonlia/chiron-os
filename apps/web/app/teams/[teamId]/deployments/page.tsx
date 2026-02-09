import { getDeploymentsByTeam, getAgentsByTeam } from "@chiron-os/db";
import { DeploymentList } from "@/components/deployments/deployment-list";
import type { Deployment, Agent } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function DeploymentsPage({ params }: PageProps) {
  const { teamId } = await params;
  const deployments = getDeploymentsByTeam(teamId) as Deployment[];
  const agents = getAgentsByTeam(teamId) as Agent[];

  const agentMap: Record<string, string> = {};
  for (const a of agents) {
    agentMap[a.id] = a.name;
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Deployments
      </h1>
      <DeploymentList teamId={teamId} initialDeployments={deployments} agentMap={agentMap} />
    </div>
  );
}
