import Link from "next/link";
import { getUsageByTeam, getUsageBreakdown } from "@chiron-os/db";
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
  const breakdown = getUsageBreakdown(teamId);

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
          Usage &amp; Costs
        </h1>
      </div>
      <UsageDashboard teamId={teamId} initialUsage={usage} initialBreakdown={breakdown} />
    </div>
  );
}
