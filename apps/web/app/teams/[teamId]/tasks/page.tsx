import { getTasksByTeam } from "@chiron-os/db";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { Task } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TasksPage({ params }: PageProps) {
  const { teamId } = await params;
  const tasks = getTasksByTeam(teamId) as Task[];

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
        Task Board
      </h1>
      <KanbanBoard teamId={teamId} initialTasks={tasks} />
    </div>
  );
}
