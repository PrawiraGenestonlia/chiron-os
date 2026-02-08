import { getTasksByTeam, getAgentsByTeam } from "@chiron-os/db";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { Task, Agent } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TasksPage({ params }: PageProps) {
  const { teamId } = await params;
  const tasks = getTasksByTeam(teamId) as Task[];
  const agents = getAgentsByTeam(teamId) as Agent[];

  const agentMap: Record<string, string> = {};
  for (const a of agents) {
    agentMap[a.id] = a.name;
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Task Board
      </h1>
      <KanbanBoard teamId={teamId} initialTasks={tasks} agentMap={agentMap} />
    </div>
  );
}
