import { getChannelsByTeam, createDefaultChannels } from "@chiron-os/db";

export function ensureTeamChannels(teamId: string) {
  const existing = getChannelsByTeam(teamId);
  if (existing.length === 0) {
    return createDefaultChannels(teamId);
  }
  return existing;
}
