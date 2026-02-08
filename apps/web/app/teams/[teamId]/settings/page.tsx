import { getTeamById } from "@chiron-os/db";
import { notFound } from "next/navigation";
import { TeamSettings } from "@/components/settings/team-settings";
import { getWorkspacePath } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();

  const actualWorkspacePath = getWorkspacePath(teamId);

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Settings
      </h1>
      <TeamSettings
        teamId={teamId}
        initialName={team.name}
        initialGoal={team.goal ?? ""}
        initialWorkspacePath={team.workspacePath || actualWorkspacePath}
      />
    </div>
  );
}
