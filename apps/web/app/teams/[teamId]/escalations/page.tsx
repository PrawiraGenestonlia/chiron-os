import { getEscalationsByTeam } from "@chiron-os/db";
import { EscalationList } from "@/components/escalations/escalation-list";
import type { Escalation } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function EscalationsPage({ params }: PageProps) {
  const { teamId } = await params;
  const escalations = getEscalationsByTeam(teamId) as Escalation[];

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Escalations
      </h1>
      <EscalationList teamId={teamId} initialEscalations={escalations} />
    </div>
  );
}
