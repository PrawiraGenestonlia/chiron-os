import { FileExplorer } from "@/components/files/file-explorer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function FilesPage({ params }: PageProps) {
  const { teamId } = await params;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FileExplorer teamId={teamId} />
    </div>
  );
}
