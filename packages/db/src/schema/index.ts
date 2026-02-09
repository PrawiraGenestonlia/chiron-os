import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ── Personas ──────────────────────────────────────────────
export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  shortCode: text("short_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrompt: text("base_prompt").notNull(),
  icon: text("icon").notNull().default("bot"),
  color: text("color").notNull().default("#6B7280"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Teams ─────────────────────────────────────────────────
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal"),
  status: text("status", {
    enum: ["idle", "running", "paused", "stopped", "error"],
  })
    .notNull()
    .default("idle"),
  workspacePath: text("workspace_path"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Agents ────────────────────────────────────────────────
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  personaId: text("persona_id")
    .notNull()
    .references(() => personas.id),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["idle", "running", "thinking", "tool_use", "paused", "stopped", "error", "restarting"],
  })
    .notNull()
    .default("idle"),
  sessionId: text("session_id"),
  modelOverride: text("model_override"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Channels ──────────────────────────────────────────────
export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["general", "planning", "design", "engineering", "escalations", "suggestions"],
  }).notNull(),
  topic: text("topic"),
  createdAt: text("created_at").notNull(),
});

// ── Messages ──────────────────────────────────────────────
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: text("author_id"),
    authorRole: text("author_role", {
      enum: ["agent", "human", "system"],
    }).notNull(),
    authorName: text("author_name"),
    threadId: text("thread_id"),
    content: text("content").notNull(),
    messageType: text("message_type", {
      enum: ["text", "code", "decision", "vote", "escalation", "task_update", "system", "feedback"],
    })
      .notNull()
      .default("text"),
    metadata: text("metadata", { mode: "json" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("messages_channel_created_idx").on(table.channelId, table.createdAt),
    index("messages_thread_idx").on(table.threadId),
  ]
);

// ── Tasks ─────────────────────────────────────────────────
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["backlog", "todo", "in_progress", "review", "done", "blocked"],
    })
      .notNull()
      .default("backlog"),
    priority: text("priority", {
      enum: ["low", "medium", "high", "critical"],
    })
      .notNull()
      .default("medium"),
    assigneeId: text("assignee_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    parentTaskId: text("parent_task_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("tasks_team_status_idx").on(table.teamId, table.status)]
);

// ── Task Dependencies ─────────────────────────────────────
export const taskDependencies = sqliteTable("task_dependencies", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: text("depends_on_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
});

// ── Token Usage ───────────────────────────────────────────
export const tokenUsage = sqliteTable(
  "token_usage",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    taskId: text("task_id"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costUsd: real("cost_usd").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("token_usage_agent_created_idx").on(table.agentId, table.createdAt),
  ]
);

// ── Escalations ───────────────────────────────────────────
export const escalations = sqliteTable("escalations", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  channelId: text("channel_id")
    .notNull()
    .references(() => channels.id),
  messageId: text("message_id"),
  reason: text("reason").notNull(),
  status: text("status", {
    enum: ["open", "in_review", "resolved", "dismissed"],
  })
    .notNull()
    .default("open"),
  votes: text("votes", { mode: "json" }),
  resolution: text("resolution"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull(),
});

// ── Logs ─────────────────────────────────────────────────
export const logs = sqliteTable(
  "logs",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    agentId: text("agent_id"),
    level: text("level", { enum: ["debug", "info", "warn", "error"] }).notNull(),
    event: text("event").notNull(),
    data: text("data", { mode: "json" }),
    latencyMs: integer("latency_ms"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("logs_team_created_idx").on(table.teamId, table.createdAt),
    index("logs_team_level_idx").on(table.teamId, table.level),
  ]
);

// ── Memories ──────────────────────────────────────────────
export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  agentId: text("agent_id"),
  category: text("category").notNull(),
  content: text("content").notNull(),
  filePath: text("file_path"),
  createdAt: text("created_at").notNull(),
});
