import { getAllTeams, getAgentsByTeam, getTasksByTeam } from "@chiron-os/db";
import { loadConfig, resolveApiKey } from "@chiron-os/shared";
import Link from "next/link";
import { CreateTeamDialog } from "@/components/team/create-team-dialog";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const teams = getAllTeams();
  const config = loadConfig(process.cwd());
  const hasApiKey = !!resolveApiKey(config);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* API key warning */}
      {!hasApiKey && (
        <div
          className="mb-6 px-4 py-3 rounded-lg border text-sm flex items-center gap-3"
          style={{
            backgroundColor: "rgba(234,179,8,0.1)",
            borderColor: "rgba(234,179,8,0.3)",
            color: "#facc15",
          }}
        >
          <span>No API key configured.</span>
          <Link href="/config" className="underline hover:no-underline">
            Add one in Config
          </Link>
          <span style={{ color: "var(--muted-foreground)" }}>
            or set <code className="text-xs">ANTHROPIC_API_KEY</code> env var.
          </span>
        </div>
      )}

      {/* Header area */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Teams
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {teams.length} team{teams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateTeamDialog />
      </div>

      {teams.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-10"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Get Started
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Configure API key", desc: "Set your Anthropic API key in Config or via environment variable." },
              { step: "2", title: "Create a team", desc: "Click \"New Team\" above. Give it a name, a goal, and select personas (PM, PD, ENG)." },
              { step: "3", title: "Start the team", desc: "Agents will introduce themselves, discuss the goal, create tasks, and begin working." },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {s.step}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
