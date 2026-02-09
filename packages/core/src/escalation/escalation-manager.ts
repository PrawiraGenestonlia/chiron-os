import { EventEmitter } from "node:events";
import {
  createEscalation,
  getEscalationsByTeam,
  getOpenEscalations,
  getEscalationById,
  updateEscalationStatus,
} from "@chiron-os/db";
import type { Escalation, EscalationStatus } from "@chiron-os/shared";
import { getLogger } from "../logging/logger.js";

interface VoteSession {
  escalationId: string;
  teamId: string;
  topic: string;
  options: string[];
  votes: Record<string, string>; // agentId → chosen option
  totalVoters: number;
  createdAt: number;
}

export class EscalationManager extends EventEmitter {
  private activeSessions = new Map<string, VoteSession>();

  /** Start a vote among agents */
  callVote(params: {
    teamId: string;
    channelId: string;
    callerId: string;
    topic: string;
    options: string[];
    totalVoters: number;
  }): Escalation {
    const escalation = createEscalation({
      teamId: params.teamId,
      channelId: params.channelId,
      reason: `Vote: ${params.topic}`,
      votes: {},
    }) as Escalation;

    this.activeSessions.set(escalation.id, {
      escalationId: escalation.id,
      teamId: params.teamId,
      topic: params.topic,
      options: params.options,
      votes: {},
      totalVoters: params.totalVoters,
      createdAt: Date.now(),
    });

    this.emit("vote:started", {
      teamId: params.teamId,
      escalation,
      topic: params.topic,
      options: params.options,
    });

    return escalation;
  }

  /** Cast a vote in an active session */
  castVote(escalationId: string, agentId: string, choice: string): {
    accepted: boolean;
    result?: "pending" | "resolved" | "deadlocked";
    winner?: string;
  } {
    const session = this.activeSessions.get(escalationId);
    if (!session) {
      return { accepted: false };
    }

    if (!session.options.includes(choice)) {
      return { accepted: false };
    }

    session.votes[agentId] = choice;

    // Check if all votes are in
    if (Object.keys(session.votes).length < session.totalVoters) {
      return { accepted: true, result: "pending" };
    }

    // Tally votes
    const tally = new Map<string, number>();
    for (const v of Object.values(session.votes)) {
      tally.set(v, (tally.get(v) ?? 0) + 1);
    }

    // Find majority (more than half)
    const majority = Math.floor(session.totalVoters / 2) + 1;
    let winner: string | undefined;
    for (const [option, count] of tally) {
      if (count >= majority) {
        winner = option;
        break;
      }
    }

    if (winner) {
      // Resolved — update DB and clean up
      updateEscalationStatus(escalationId, "resolved", `Majority vote: ${winner}`);
      this.activeSessions.delete(escalationId);

      this.emit("vote:resolved", {
        teamId: session.teamId,
        escalationId,
        winner,
        votes: session.votes,
      });

      return { accepted: true, result: "resolved", winner };
    }

    // Deadlocked — escalate to human
    updateEscalationStatus(escalationId, "open");
    this.activeSessions.delete(escalationId);

    const escalation = getEscalationById(escalationId);

    this.emit("vote:deadlocked", {
      teamId: session.teamId,
      escalationId,
      topic: session.topic,
      votes: session.votes,
    });

    this.emit("escalation:new", {
      teamId: session.teamId,
      escalation,
    });

    return { accepted: true, result: "deadlocked" };
  }

  /** Directly escalate an issue to the human */
  escalate(params: {
    teamId: string;
    channelId: string;
    agentId: string;
    reason: string;
    messageId?: string;
  }): Escalation {
    const escalation = createEscalation({
      teamId: params.teamId,
      channelId: params.channelId,
      messageId: params.messageId,
      reason: params.reason,
    }) as Escalation;

    this.emit("escalation:new", {
      teamId: params.teamId,
      escalation,
    });

    return escalation;
  }

  /** Human resolves an escalation */
  resolve(escalationId: string, resolution: string): Escalation | null {
    const updated = updateEscalationStatus(escalationId, "resolved" as EscalationStatus, resolution);
    if (!updated) return null;

    const escalation = updated as Escalation;
    getLogger().info(escalation.teamId, "escalation.resolved", {
      escalationId,
      resolution,
    });
    this.emit("escalation:resolved", {
      teamId: escalation.teamId,
      escalation,
    });

    return escalation;
  }

  /** Dismiss an escalation */
  dismiss(escalationId: string): Escalation | null {
    const updated = updateEscalationStatus(escalationId, "dismissed" as EscalationStatus);
    return updated as Escalation | null;
  }

  getByTeam(teamId: string) {
    return getEscalationsByTeam(teamId);
  }

  getOpen(teamId: string) {
    return getOpenEscalations(teamId);
  }

  getById(id: string) {
    return getEscalationById(id);
  }
}
