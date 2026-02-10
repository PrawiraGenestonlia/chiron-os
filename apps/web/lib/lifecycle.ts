// Access the LifecycleManager set by server.ts via globalThis
// We avoid importing from @chiron-os/core here to prevent
// the Claude Agent SDK from being pulled into the Next.js build.

interface LifecycleHandle {
  startTeam(teamId: string): Promise<void>;
  stopTeam(teamId: string): void;
  addAgent(data: { teamId: string; personaId: string; name: string; modelOverride?: string }): unknown;
  restartAgent(agentId: string): Promise<void>;
  sendHumanMessage(teamId: string, channelName: string, content: string): void;
  getTeamAgentStatuses(teamId: string): Array<{ agentId: string; status: string; running: boolean }>;
  getTeamRuntimeInfo(teamId: string): { startedAt: string | null; maxRuntimeMinutes: number | null };
  shutdown(): void;
}

export function getLifecycle(): LifecycleHandle {
  const lm = (globalThis as Record<string, unknown>).__chiron_lifecycle as LifecycleHandle | undefined;
  if (!lm) {
    throw new Error("LifecycleManager not initialized — make sure the custom server is running");
  }
  return lm;
}
