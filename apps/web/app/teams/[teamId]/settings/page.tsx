import Link from "next/link";
import { getTeamById } from "@chiron-os/db";
import { notFound } from "next/navigation";
import { TeamSettings } from "@/components/settings/team-settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();

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
          Settings
        </h1>
      </div>
      <TeamSettings
        teamId={teamId}
        initialName={team.name}
        initialGoal={team.goal ?? ""}
        initialWorkspacePath={team.workspacePath ?? ""}
      />
    </div>
  );
}
