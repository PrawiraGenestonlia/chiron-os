import { getAllTeams, getAgentsByTeam, getTasksByTeam } from "@chiron-os/db";
import Link from "next/link";
import { CreateTeamDialog } from "@/components/team/create-team-dialog";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const teams = getAllTeams();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono" style={{ color: "var(--foreground)" }}>
            Chiron OS
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            AI Team Orchestration
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/personas"
            className="px-4 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--secondary-foreground)" }}
          >
            Personas
          </Link>
          <Link
            href="/config"
            className="px-4 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--secondary-foreground)" }}
          >
            Config
          </Link>
          <CreateTeamDialog />
        </div>
      </div>

      {teams.length === 0 ? (
        <div
          className="text-center py-20 rounded-lg border border-dashed"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-lg mb-2" style={{ color: "var(--muted-foreground)" }}>
            No teams yet
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Create a team to get started with autonomous AI agents
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => {
            const agents = getAgentsByTeam(team.id);
            const allTasks = getTasksByTeam(team.id);
            const doneTasks = allTasks.filter((t) => t.status === "done");
            const runningAgents = agents.filter((a) => a.status === "running");

            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="block p-5 rounded-lg border transition-all hover:border-blue-500/50 hover:bg-white/[0.02]"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-lg" style={{ color: "var(--card-foreground)" }}>
                    {team.name}
                  </h2>
                  <StatusBadge status={team.status} />
                </div>
                {team.goal && (
                  <p className="text-sm line-clamp-2 mb-4" style={{ color: "var(--muted-foreground)" }}>
                    {team.goal}
                  </p>
                )}
                <div className="flex gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <span>
                    <span style={{ color: "var(--foreground)" }}>{agents.length}</span> agents
                    {runningAgents.length > 0 && (
                      <span style={{ color: "#4ade80" }}> ({runningAgents.length} active)</span>
                    )}
                  </span>
                  <span>
                    <span style={{ color: "var(--foreground)" }}>{doneTasks.length}</span>/{allTasks.length} tasks done
                  </span>
                </div>
                {allTasks.length > 0 && (
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${allTasks.length > 0 ? (doneTasks.length / allTasks.length) * 100 : 0}%`,
                        backgroundColor: doneTasks.length === allTasks.length ? "#22c55e" : "#3b82f6",
                      }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    idle: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280" },
    running: { bg: "rgba(34,197,94,0.15)", text: "#4ade80", dot: "#22c55e" },
    stopped: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#6b7280" },
    error: { bg: "rgba(239,68,68,0.15)", text: "#f87171", dot: "#ef4444" },
  };
  const s = styles[status] ?? styles.idle;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: s.dot,
          boxShadow: status === "running" ? `0 0 6px ${s.dot}` : "none",
        }}
      />
      {status}
    </span>
  );
}
