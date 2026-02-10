// ── Personas ──────────────────────────────────────────────
export interface Persona {
  id: string;
  shortCode: string;
  name: string;
  description: string;
  basePrompt: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PersonaCreate = Pick<
  Persona,
  "shortCode" | "name" | "description" | "basePrompt" | "icon" | "color"
>;

export type PersonaUpdate = Partial<PersonaCreate>;

// ── Teams ─────────────────────────────────────────────────
export type TeamStatus = "idle" | "running" | "paused" | "stopped" | "error";

export interface Team {
  id: string;
  name: string;
  goal: string | null;
  status: TeamStatus;
  workspacePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TeamCreate = Pick<Team, "name"> & { goal?: string };
export type TeamUpdate = Partial<Pick<Team, "name" | "goal" | "status" | "workspacePath">>;

// ── Agents ────────────────────────────────────────────────
export type AgentStatus =
  | "idle"
  | "running"
  | "thinking"
  | "tool_use"
  | "paused"
  | "stopped"
  | "error"
  | "restarting";

export interface Agent {
  id: string;
  teamId: string;
  personaId: string;
  name: string;
  status: AgentStatus;
  sessionId: string | null;
  modelOverride: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AgentCreate = Pick<Agent, "teamId" | "personaId" | "name"> & {
  modelOverride?: string;
};

// ── Channels ──────────────────────────────────────────────
export type ChannelType = "general" | "agents" | "escalations" | "suggestions";

export interface Channel {
  id: string;
  teamId: string;
  name: string;
  type: ChannelType;
  topic: string | null;
  createdAt: string;
}

// ── Messages ──────────────────────────────────────────────
export type MessageType =
  | "text"
  | "code"
  | "decision"
  | "vote"
  | "escalation"
  | "task_update"
  | "system"
  | "feedback";

export type AuthorRole = "agent" | "human" | "system";

export interface Message {
  id: string;
  channelId: string;
  channelName?: string;
  authorId: string | null;
  authorRole: AuthorRole;
  authorName: string | null;
  threadId: string | null;
  content: string;
  messageType: MessageType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type MessageCreate = Pick<
  Message,
  "channelId" | "authorId" | "authorRole" | "content" | "messageType"
> & {
  authorName?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
};

// ── Tasks ─────────────────────────────────────────────────
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskCreate = Pick<Task, "teamId" | "title"> & {
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  parentTaskId?: string;
};

export type TaskUpdate = Partial<
  Pick<Task, "title" | "description" | "status" | "priority" | "assigneeId">
>;

// ── Token Usage ───────────────────────────────────────────
export interface TokenUsage {
  id: string;
  agentId: string;
  teamId: string;
  taskId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
}

// ── Escalations ───────────────────────────────────────────
export type EscalationStatus = "open" | "in_review" | "resolved" | "dismissed";

export interface Escalation {
  id: string;
  teamId: string;
  channelId: string;
  messageId: string | null;
  reason: string;
  status: EscalationStatus;
  votes: Record<string, string> | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ── Memories ──────────────────────────────────────────────
export interface Memory {
  id: string;
  teamId: string;
  agentId: string | null;
  category: string;
  content: string;
  filePath: string | null;
  createdAt: string;
}

// ── Logs ─────────────────────────────────────────────────
export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent =
  | "agent.started" | "agent.stopped" | "agent.error" | "agent.restarting"
  | "agent.context_rotation"
  | "tool.called" | "message.sent"
  | "task.created" | "task.updated"
  | "vote.started" | "vote.resolved" | "vote.deadlocked"
  | "escalation.created" | "escalation.resolved"
  | "budget.warning" | "budget.exceeded"
  | "token.recorded" | "queue.aggregated"
  | "team.started" | "team.stopped" | "team.max_runtime_reached";

export interface LogEntry {
  id: string;
  teamId: string;
  agentId: string | null;
  level: LogLevel;
  event: LogEvent;
  data: Record<string, unknown> | null;
  latencyMs: number | null;
  createdAt: string;
}

// ── Deployments ──────────────────────────────────────────
export type DeploymentStatus = "queued" | "building" | "ready" | "error" | "canceled";
export type DeploymentEnvironment = "production" | "preview" | "development";
export type DeploymentProvider = "vercel" | "netlify" | "other";

export interface Deployment {
  id: string;
  teamId: string;
  agentId: string | null;
  provider: DeploymentProvider;
  projectName: string;
  deploymentUrl: string | null;
  inspectUrl: string | null;
  status: DeploymentStatus;
  environment: DeploymentEnvironment;
  commitSha: string | null;
  commitMessage: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type DeploymentCreate = Pick<Deployment, "teamId"> & {
  agentId?: string;
  provider?: DeploymentProvider;
  projectName: string;
  deploymentUrl?: string;
  inspectUrl?: string;
  status?: DeploymentStatus;
  environment?: DeploymentEnvironment;
  commitSha?: string;
  commitMessage?: string;
  meta?: Record<string, unknown>;
};

export type DeploymentUpdate = Partial<
  Pick<Deployment, "status" | "deploymentUrl" | "inspectUrl" | "environment" | "meta">
>;

// ── WebSocket Events ──────────────────────────────────────
export type WSServerEvent =
  | { type: "message:new"; data: Message }
  | { type: "agent:status"; data: { agentId: string; status: AgentStatus; teamId: string } }
  | { type: "agent:stream"; data: { agentId: string; chunk: string; teamId: string } }
  | { type: "task:created"; data: Task }
  | { type: "task:updated"; data: Task }
  | { type: "escalation:new"; data: Escalation }
  | { type: "escalation:resolved"; data: Escalation }
  | { type: "team:status"; data: { teamId: string; status: TeamStatus; startedAt?: string; maxRuntimeMinutes?: number; reason?: string } }
  | { type: "vote:started"; data: { teamId: string; escalationId: string; reason: string } }
  | { type: "vote:resolved"; data: { teamId: string; escalationId: string } }
  | { type: "vote:deadlocked"; data: { teamId: string; escalationId: string } }
  | { type: "usage:update"; data: TokenUsage }
  | { type: "idle:nudge"; data: { teamId: string; nudgeCount: number; nextNudgeAt: string | null; status: "active" | "backed_off" | "hibernating" } }
  | { type: "log:new"; data: LogEntry }
  | { type: "deployment:new"; data: Deployment }
  | { type: "deployment:updated"; data: Deployment }
  | { type: "error"; data: { message: string } };

export type WSClientEvent =
  | { type: "subscribe"; data: { teamId: string; token?: string } }
  | { type: "unsubscribe"; data: { teamId: string } }
  | { type: "message:send"; data: MessageCreate }
  | { type: "task:update"; data: { taskId: string } & TaskUpdate }
  | { type: "escalation:resolve"; data: { escalationId: string; resolution: string } }
  | { type: "agent:restart"; data: { agentId: string } };
