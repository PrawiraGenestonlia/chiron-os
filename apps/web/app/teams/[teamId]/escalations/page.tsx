import { getEscalationsByTeam, getAgentsByTeam, getChannelsByTeam } from "@chiron-os/db";
import { EscalationList } from "@/components/escalations/escalation-list";
import type { Escalation, Agent, Channel } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function EscalationsPage({ params }: PageProps) {
  const { teamId } = await params;
  const escalations = getEscalationsByTeam(teamId) as Escalation[];
  const agents = getAgentsByTeam(teamId) as Agent[];
  const channels = getChannelsByTeam(teamId) as Channel[];

  const agentMap: Record<string, string> = {};
  for (const a of agents) {
    agentMap[a.id] = a.name;
  }

  const channelMap: Record<string, string> = {};
  for (const c of channels) {
    channelMap[c.id] = c.name;
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Escalations
      </h1>
      <EscalationList
        teamId={teamId}
        initialEscalations={escalations}
        agentMap={agentMap}
        channelMap={channelMap}
      />
    </div>
  );
}
