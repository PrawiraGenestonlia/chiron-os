import {
  getTeamById,
  getAgentsByTeam,
  getTasksByTeam,
  getEscalationsByTeam,
  getUsageByTeam,
  getRecentMessagesByTeam,
  getPersonaById,
} from "@chiron-os/db";
import { notFound } from "next/navigation";
import { TeamOverview } from "@/components/team/team-overview";
import { getLifecycle } from "@/lib/lifecycle";
import type { Agent, Task, Escalation } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamPage({ params }: PageProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();

  const agents = getAgentsByTeam(teamId) as Agent[];
  const tasks = getTasksByTeam(teamId) as Task[];
  const escalations = getEscalationsByTeam(teamId) as Escalation[];
  const usage = getUsageByTeam(teamId);
  const rawMessages = getRecentMessagesByTeam(teamId, 10);
  const recentMessages = rawMessages.map((m) => ({
    ...m,
    metadata: (m.metadata as Record<string, unknown> | null) ?? null,
  }));

  // Enrich agents with persona short codes
  const enrichedAgents = agents.map((agent) => {
    const persona = getPersonaById(agent.personaId);
    return { ...agent, personaShortCode: persona?.shortCode };
  });

  // Get runtime info if team is running
  let runtimeInfo: { startedAt: string | null; maxRuntimeMinutes: number | null } = { startedAt: null, maxRuntimeMinutes: null };
  try {
    const lifecycle = getLifecycle();
    runtimeInfo = lifecycle.getTeamRuntimeInfo(teamId);
  } catch {
    // Lifecycle not available (build time or not started)
  }

  return (
    <TeamOverview
      teamId={teamId}
      teamName={team.name}
      teamGoal={team.goal}
      teamStatus={team.status}
      initialAgents={enrichedAgents}
      initialTasks={tasks}
      initialEscalations={escalations}
      initialCost={usage?.totalCostUsd ?? 0}
      initialMessages={recentMessages}
      initialStartedAt={runtimeInfo.startedAt}
      initialMaxRuntimeMinutes={runtimeInfo.maxRuntimeMinutes}
    />
  );
}
