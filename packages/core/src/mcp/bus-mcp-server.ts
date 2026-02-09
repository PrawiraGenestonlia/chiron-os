import { MessageBus } from "../bus/message-bus.js";
import { createTask, updateTask, getTasksByTeam, getTaskById, createMemory, getMemoriesByTeam } from "@chiron-os/db";
import type { TaskCreate, TaskUpdate } from "@chiron-os/shared";
import { EscalationManager } from "../escalation/escalation-manager.js";
import { getLogger } from "../logging/logger.js";

export interface BusMcpContext {
  agentId: string;
  agentName: string;
  teamId: string;
  bus: MessageBus;
  escalationManager?: EscalationManager;
  teamAgentCount?: number;
}

export type BusToolName =
  | "send_message"
  | "read_channel"
  | "create_task"
  | "update_task"
  | "list_tasks"
  | "call_vote"
  | "cast_vote"
  | "escalate"
  | "save_learning"
  | "get_learnings";

export interface BusToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function handleBusTool(
  ctx: BusMcpContext,
  toolName: BusToolName,
  input: Record<string, unknown>
): BusToolResult {
  const start = Date.now();
  const logger = getLogger();
  try {
    let result: BusToolResult;
    switch (toolName) {
      case "send_message":
        result = handleSendMessage(ctx, input);
        break;
      case "read_channel":
        result = handleReadChannel(ctx, input);
        break;
      case "create_task":
        result = handleCreateTask(ctx, input);
        break;
      case "update_task":
        result = handleUpdateTask(ctx, input);
        break;
      case "list_tasks":
        result = handleListTasks(ctx);
        break;
      case "call_vote":
        result = handleCallVote(ctx, input);
        break;
      case "cast_vote":
        result = handleCastVote(ctx, input);
        break;
      case "escalate":
        result = handleEscalate(ctx, input);
        break;
      case "save_learning":
        result = handleSaveLearning(ctx, input);
        break;
      case "get_learnings":
        result = handleGetLearnings(ctx, input);
        break;
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${toolName}` }], isError: true };
    }
    const latencyMs = Date.now() - start;
    logger.debug(ctx.teamId, "tool.called", { tool: toolName, agentId: ctx.agentId }, ctx.agentId, latencyMs);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}

function handleSendMessage(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  const channelName = input.channel as string;
  const content = input.content as string;
  const messageType = (input.message_type as string) ?? "text";

  if (!channelName || !content) {
    return { content: [{ type: "text", text: "channel and content are required" }], isError: true };
  }

  const message = ctx.bus.post({
    channelName,
    authorId: ctx.agentId,
    authorRole: "agent",
    authorName: ctx.agentName,
    content,
    messageType: messageType as "text",
    threadId: input.thread_id as string | undefined,
  });

  getLogger().debug(ctx.teamId, "message.sent", { channel: channelName, messageId: message.id }, ctx.agentId);

  return { content: [{ type: "text", text: `Message sent (id: ${message.id})` }] };
}

function handleReadChannel(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  const channelName = input.channel as string;
  const limit = (input.limit as number) ?? 20;

  if (!channelName) {
    return { content: [{ type: "text", text: "channel is required" }], isError: true };
  }

  const channel = ctx.bus.findChannelByName(channelName);
  if (!channel) {
    return { content: [{ type: "text", text: `Channel #${channelName} not found` }], isError: true };
  }

  const messages = ctx.bus.query(channel.id, { limit });
  const formatted = messages
    .map((m) => `[${m.createdAt}] ${m.authorName ?? m.authorRole}: ${m.content}`)
    .join("\n");

  return { content: [{ type: "text", text: formatted || "No messages yet" }] };
}

function handleCreateTask(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  const title = input.title as string;
  if (!title) {
    return { content: [{ type: "text", text: "title is required" }], isError: true };
  }

  const taskData: TaskCreate = {
    teamId: ctx.teamId,
    title,
    description: input.description as string | undefined,
    status: (input.status as TaskCreate["status"]) ?? "todo",
    priority: (input.priority as TaskCreate["priority"]) ?? "medium",
    assigneeId: input.assignee_id as string | undefined,
  };

  const task = createTask(taskData);
  getLogger().info(ctx.teamId, "task.created", { taskId: task.id, title: task.title }, ctx.agentId);
  return { content: [{ type: "text", text: `Task created: "${task.title}" (id: ${task.id}, status: ${task.status})` }] };
}

function handleUpdateTask(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  const taskId = input.task_id as string;
  if (!taskId) {
    return { content: [{ type: "text", text: "task_id is required" }], isError: true };
  }

  const existing = getTaskById(taskId);
  if (!existing) {
    return { content: [{ type: "text", text: `Task ${taskId} not found` }], isError: true };
  }

  // Verify the task belongs to the agent's team
  if (existing.teamId !== ctx.teamId) {
    return { content: [{ type: "text", text: `Task ${taskId} does not belong to this team` }], isError: true };
  }

  const updates: TaskUpdate = {};
  if (input.title) updates.title = input.title as string;
  if (input.description !== undefined) updates.description = input.description as string;
  if (input.status) updates.status = input.status as TaskUpdate["status"];
  if (input.priority) updates.priority = input.priority as TaskUpdate["priority"];
  if (input.assignee_id !== undefined) updates.assigneeId = input.assignee_id as string;

  const updated = updateTask(taskId, updates);
  getLogger().info(ctx.teamId, "task.updated", { taskId, status: updated?.status }, ctx.agentId);
  return { content: [{ type: "text", text: `Task updated: "${updated?.title}" (status: ${updated?.status})` }] };
}

function handleListTasks(ctx: BusMcpContext): BusToolResult {
  const tasks = getTasksByTeam(ctx.teamId);
  if (tasks.length === 0) {
    return { content: [{ type: "text", text: "No tasks on the board" }] };
  }

  const formatted = tasks
    .map((t) => `- [${t.status}] ${t.title} (${t.priority}, id: ${t.id})`)
    .join("\n");

  return { content: [{ type: "text", text: formatted }] };
}

function handleCallVote(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  if (!ctx.escalationManager) {
    return { content: [{ type: "text", text: "Escalation manager not available" }], isError: true };
  }

  const topic = input.topic as string;
  const options = input.options as string[];
  const channelName = (input.channel as string) ?? "escalations";

  if (!topic || !options || options.length < 2) {
    return { content: [{ type: "text", text: "topic and at least 2 options are required" }], isError: true };
  }

  const channel = ctx.bus.findChannelByName(channelName);
  if (!channel) {
    return { content: [{ type: "text", text: `Channel #${channelName} not found` }], isError: true };
  }

  const escalation = ctx.escalationManager.callVote({
    teamId: ctx.teamId,
    channelId: channel.id,
    callerId: ctx.agentId,
    topic,
    options,
    totalVoters: ctx.teamAgentCount ?? 3,
  });

  // Post a system message about the vote
  ctx.bus.post({
    channelName,
    authorId: ctx.agentId,
    authorRole: "agent",
    authorName: ctx.agentName,
    content: `Called a vote: "${topic}"\nOptions: ${options.join(", ")}`,
    messageType: "vote",
  });

  getLogger().info(ctx.teamId, "vote.started", { escalationId: escalation.id, topic }, ctx.agentId);
  return { content: [{ type: "text", text: `Vote started (id: ${escalation.id}). Options: ${options.join(", ")}` }] };
}

function handleCastVote(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  if (!ctx.escalationManager) {
    return { content: [{ type: "text", text: "Escalation manager not available" }], isError: true };
  }

  const escalationId = input.escalation_id as string;
  const choice = input.choice as string;

  if (!escalationId || !choice) {
    return { content: [{ type: "text", text: "escalation_id and choice are required" }], isError: true };
  }

  const result = ctx.escalationManager.castVote(escalationId, ctx.agentId, choice);
  if (!result.accepted) {
    return { content: [{ type: "text", text: "Vote not accepted. Check escalation ID and choice." }], isError: true };
  }

  if (result.result === "resolved") {
    return { content: [{ type: "text", text: `Vote resolved! Winner: ${result.winner}` }] };
  }
  if (result.result === "deadlocked") {
    return { content: [{ type: "text", text: "Vote deadlocked — escalated to human for resolution." }] };
  }

  return { content: [{ type: "text", text: "Vote recorded. Waiting for other agents to vote." }] };
}

function handleEscalate(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  if (!ctx.escalationManager) {
    return { content: [{ type: "text", text: "Escalation manager not available" }], isError: true };
  }

  const reason = input.reason as string;
  const channelName = (input.channel as string) ?? "escalations";

  if (!reason) {
    return { content: [{ type: "text", text: "reason is required" }], isError: true };
  }

  const channel = ctx.bus.findChannelByName(channelName);
  if (!channel) {
    return { content: [{ type: "text", text: `Channel #${channelName} not found` }], isError: true };
  }

  const escalation = ctx.escalationManager.escalate({
    teamId: ctx.teamId,
    channelId: channel.id,
    agentId: ctx.agentId,
    reason,
  });

  // Post a system message about the escalation
  ctx.bus.post({
    channelName: "escalations",
    authorId: ctx.agentId,
    authorRole: "agent",
    authorName: ctx.agentName,
    content: `Escalated to human: ${reason}`,
    messageType: "escalation",
  });

  return { content: [{ type: "text", text: `Escalation created (id: ${escalation.id}). Human will be notified.` }] };
}

function handleSaveLearning(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  const category = input.category as string;
  const content = input.content as string;

  if (!category || !content) {
    return { content: [{ type: "text", text: "category and content are required" }], isError: true };
  }

  const memory = createMemory({
    teamId: ctx.teamId,
    agentId: ctx.agentId,
    category,
    content,
  });

  return { content: [{ type: "text", text: `Learning saved (id: ${memory.id}, category: ${category})` }] };
}

function handleGetLearnings(ctx: BusMcpContext, input: Record<string, unknown>): BusToolResult {
  const category = input.category as string | undefined;
  const memories = getMemoriesByTeam(ctx.teamId, category);

  if (memories.length === 0) {
    return { content: [{ type: "text", text: category ? `No learnings found for category "${category}"` : "No learnings saved yet" }] };
  }

  const formatted = memories
    .map((m) => `- [${m.category}] ${m.content} (saved: ${m.createdAt})`)
    .join("\n");

  return { content: [{ type: "text", text: formatted }] };
}

export const BUS_TOOL_DEFINITIONS = [
  {
    name: "send_message",
    description: "Send a message to a team channel",
    input_schema: {
      type: "object" as const,
      properties: {
        channel: { type: "string", description: "Channel name (e.g., 'general', 'engineering')" },
        content: { type: "string", description: "Message content" },
        message_type: {
          type: "string",
          enum: ["text", "code", "decision", "vote", "task_update", "feedback"],
          description: "Type of message (default: text)",
        },
        thread_id: { type: "string", description: "Optional thread ID for replies" },
      },
      required: ["channel", "content"],
    },
  },
  {
    name: "read_channel",
    description: "Read recent messages from a team channel",
    input_schema: {
      type: "object" as const,
      properties: {
        channel: { type: "string", description: "Channel name (e.g., 'general', 'engineering')" },
        limit: { type: "number", description: "Max messages to return (default: 20)" },
      },
      required: ["channel"],
    },
  },
  {
    name: "create_task",
    description: "Create a task on the team's task board",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        status: {
          type: "string",
          enum: ["backlog", "todo", "in_progress", "review", "done", "blocked"],
          description: "Task status (default: todo)",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Task priority (default: medium)",
        },
        assignee_id: { type: "string", description: "Agent ID to assign the task to" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task on the task board",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Task ID to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        status: {
          type: "string",
          enum: ["backlog", "todo", "in_progress", "review", "done", "blocked"],
          description: "New status",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "New priority",
        },
        assignee_id: { type: "string", description: "New assignee agent ID" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_tasks",
    description: "List all tasks on the team's task board",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "call_vote",
    description: "Start a vote among team agents on a topic. If the vote deadlocks (no majority), it auto-escalates to the human.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "What the vote is about" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Vote options (at least 2)",
        },
        channel: { type: "string", description: "Channel for the vote (default: escalations)" },
      },
      required: ["topic", "options"],
    },
  },
  {
    name: "cast_vote",
    description: "Cast your vote in an active vote session",
    input_schema: {
      type: "object" as const,
      properties: {
        escalation_id: { type: "string", description: "The escalation/vote ID" },
        choice: { type: "string", description: "Your chosen option" },
      },
      required: ["escalation_id", "choice"],
    },
  },
  {
    name: "escalate",
    description: "Escalate an issue to the human operator. Use when you're stuck, need a decision, or encounter a problem you can't resolve. Include: what went wrong, what you've tried, and suggestions.",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: { type: "string", description: "Detailed reason for escalation — include what went wrong, what tools/access you need, and suggested solutions" },
        channel: { type: "string", description: "Channel for the escalation (default: escalations)" },
      },
      required: ["reason"],
    },
  },
  {
    name: "save_learning",
    description: "Save a team learning, insight, or decision for future reference. All team members will see saved learnings in their system prompt.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Category (e.g., 'technical', 'process', 'design', 'user_feedback', 'decision')",
        },
        content: { type: "string", description: "The learning or insight to save" },
      },
      required: ["category", "content"],
    },
  },
  {
    name: "get_learnings",
    description: "Retrieve saved team learnings and past decisions",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter by category, or omit for all",
        },
      },
      required: [],
    },
  },
];
