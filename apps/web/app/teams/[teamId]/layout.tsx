import { notFound } from "next/navigation";
import { getTeamById, getAgentsByTeam, getTasksByTeam, getEscalationsByTeam } from "@chiron-os/db";
import { TeamSidebar } from "@/components/layout/team-sidebar";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}

export default async function TeamLayout({ children, params }: LayoutProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();

  const agents = getAgentsByTeam(teamId);
  const tasks = getTasksByTeam(teamId);
  const escalations = getEscalationsByTeam(teamId);
  const openEscalations = escalations.filter((e) => e.status === "open").length;

  return (
    <div className="flex h-full">
      <TeamSidebar
        teamId={teamId}
        teamName={team.name}
        teamStatus={team.status}
        agentCount={agents.length}
        taskCount={tasks.length}
        openEscalations={openEscalations}
      />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
