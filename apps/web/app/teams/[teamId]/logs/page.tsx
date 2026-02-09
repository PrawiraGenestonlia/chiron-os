import { getLogsByTeam, getAgentsByTeam } from "@chiron-os/db";
import { LogViewer } from "@/components/logs/log-viewer";
import type { LogEntry, Agent } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function LogsPage({ params }: PageProps) {
  const { teamId } = await params;
  const logs = getLogsByTeam(teamId, { limit: 100 }) as LogEntry[];
  const agents = getAgentsByTeam(teamId) as Agent[];

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Logs
      </h1>
      <LogViewer teamId={teamId} initialLogs={logs} agents={agents} />
    </div>
  );
}
