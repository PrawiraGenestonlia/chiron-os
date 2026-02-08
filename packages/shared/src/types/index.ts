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
export type ChannelType = "general" | "planning" | "design" | "engineering" | "escalations" | "suggestions";

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

// ── WebSocket Events ──────────────────────────────────────
export type WSServerEvent =
  | { type: "message:new"; data: Message }
  | { type: "agent:status"; data: { agentId: string; status: AgentStatus; teamId: string } }
  | { type: "agent:stream"; data: { agentId: string; chunk: string; teamId: string } }
  | { type: "task:created"; data: Task }
  | { type: "task:updated"; data: Task }
  | { type: "escalation:new"; data: Escalation }
  | { type: "usage:update"; data: TokenUsage }
  | { type: "error"; data: { message: string } };

export type WSClientEvent =
  | { type: "subscribe"; data: { teamId: string } }
  | { type: "unsubscribe"; data: { teamId: string } }
  | { type: "message:send"; data: MessageCreate }
  | { type: "task:update"; data: { taskId: string } & TaskUpdate }
  | { type: "escalation:resolve"; data: { escalationId: string; resolution: string } }
  | { type: "agent:restart"; data: { agentId: string } };
