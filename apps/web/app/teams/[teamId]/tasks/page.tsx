import Link from "next/link";
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
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/teams/${teamId}`}
          className="text-sm transition-colors hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          Task Board
        </h1>
      </div>
      <KanbanBoard teamId={teamId} initialTasks={tasks} />
    </div>
  );
}
