import { getUsageByTeam, getUsageBreakdown, getAgentById } from "@chiron-os/db";
import { UsageDashboard } from "@/components/usage/usage-dashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function UsagePage({ params }: PageProps) {
  const { teamId } = await params;
  const usage = getUsageByTeam(teamId) ?? {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
  };
  const breakdown = getUsageBreakdown(teamId).map((entry) => {
    const agent = getAgentById(entry.agentId);
    return { ...entry, agentName: agent?.name ?? entry.agentId.slice(0, 8) };
  });

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Usage &amp; Costs
      </h1>
      <UsageDashboard teamId={teamId} initialUsage={usage} initialBreakdown={breakdown} />
    </div>
  );
}
