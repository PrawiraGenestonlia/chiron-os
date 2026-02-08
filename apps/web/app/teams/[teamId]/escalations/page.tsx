import Link from "next/link";
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/teams/${teamId}`}
          className="text-sm transition-colors hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          Escalations
        </h1>
      </div>
      <EscalationList teamId={teamId} initialEscalations={escalations} />
    </div>
  );
}
