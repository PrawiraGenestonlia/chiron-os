import { getChannelsByTeam } from "@chiron-os/db";
import { MessagesView } from "@/components/messages/messages-view";
import type { Channel } from "@chiron-os/shared";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function MessagesPage({ params }: PageProps) {
  const { teamId } = await params;
  const channels = getChannelsByTeam(teamId) as Channel[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 shrink-0">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          Messages
        </h1>
      </div>
      <div className="flex-1 px-6 pb-6 min-h-0">
        <MessagesView teamId={teamId} channels={channels} />
      </div>
    </div>
  );
}
