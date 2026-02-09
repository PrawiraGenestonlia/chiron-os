import { getTeamById, getPersonaById, getAgentsByTeam, getChannelsByTeam, getMemoriesByTeam, getTasksByTeam, getRecentMessagesByTeam } from "@chiron-os/db";

interface PromptContext {
  agentId: string;
  agentName: string;
  teamId: string;
  personaId: string;
  workspacePath: string;
  mcpServerNames?: string[];
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const team = getTeamById(ctx.teamId);
  const persona = getPersonaById(ctx.personaId);
  const teammates = getAgentsByTeam(ctx.teamId);
  const channels = getChannelsByTeam(ctx.teamId);

  if (!team || !persona) {
    throw new Error(`Missing team or persona for agent ${ctx.agentId}`);
  }

  const otherAgents = teammates
    .filter((a) => a.id !== ctx.agentId)
    .map((a) => {
      const p = getPersonaById(a.personaId);
      return `- ${a.name} (${p?.shortCode ?? "unknown"})`;
    })
    .join("\n");

  const channelList = channels.map((c) => `- #${c.name}: ${c.topic ?? c.type}`).join("\n");

  // Build learnings section
  const memories = getMemoriesByTeam(ctx.teamId);
  const recentLearnings = memories.slice(-20);
  let learningsSection = "";
  if (recentLearnings.length > 0) {
    const learningLines = recentLearnings
      .map((m) => `- [${m.category}] ${m.content}`)
      .join("\n");
    learningsSection = `

## Team Learnings

Previous insights saved by the team:
${learningLines}
`;
  }

  // Build external MCP servers section
  let mcpSection = "";
  if (ctx.mcpServerNames && ctx.mcpServerNames.length > 0) {
    const serverList = ctx.mcpServerNames.map((n) => `- ${n}`).join("\n");
    mcpSection = `

You also have access to external MCP tool servers:
${serverList}

Use these to gather insights about user behavior, codebase state, etc.`;
  }

  // PM proactive section
  let pmProactiveSection = "";
  if (persona.shortCode === "pm") {
    pmProactiveSection = `

## Proactive Product Leadership

You are not a passive PM who waits for instructions. You drive the product forward.

When you receive a "[System: Idle Check]" message:
- **User perspective**: Review app files. What would a real user think?
- **Feature gaps**: What features would users expect?
- **Quality bar**: Would you ship this to production?
- **Testing**: Are there tests? Would QA be satisfied?
- **Documentation**: Could a new dev onboard from the README?

When you find improvements:
1. Post analysis to #planning
2. Create prioritized tasks
3. Assign to team members
4. Save decisions using save_learning
5. Follow up — don't just delegate

If genuinely polished, stay silent. Don't invent busywork.`;
  }

  // SRE proactive section
  let sreProactiveSection = "";
  if (persona.shortCode === "sre") {
    sreProactiveSection = `

## Proactive Reliability Monitoring

When you receive a "[System: Idle Check]" message:
- **Deployment health**: Use Vercel MCP tools to check recent deployment status
- **Error logs**: Review runtime logs for new errors or warnings
- **Build status**: Check if latest builds are succeeding
- **Performance**: Look for slow responses or timeout patterns

When you find issues:
1. Post analysis to #engineering with specific error details
2. Create prioritized tasks for ENG
3. Save findings using save_learning
4. Follow up on previously reported issues — check if fixes were deployed

If everything is healthy, stay silent. Don't invent busywork.`;
  }

  return `${persona.basePrompt}

---

## Team Context

**Team:** ${team.name}
**Goal:** ${team.goal ?? "No goal set yet"}
**Your Name:** ${ctx.agentName}
**Your Role:** ${persona.name} (${persona.shortCode})

### Teammates
${otherAgents || "No other agents yet"}

### Available Channels
${channelList}
${learningsSection}
## Workspace

Your working directory is: ${ctx.workspacePath}

**CRITICAL: You MUST only create, read, and modify files within your workspace directory.** You are running inside Chiron OS, which is the orchestration layer. The workspace is where your team's project lives — it is completely separate from Chiron OS itself. Never navigate outside your workspace. Never modify files in parent directories. All your work (code, docs, configs) must happen within: ${ctx.workspacePath}

## Tools

You have access to the following Chiron OS tools via MCP:

- **send_message** — Post a message to a team channel
- **read_channel** — Read recent messages from a channel
- **create_task** — Create a task on the team's task board
- **update_task** — Update a task's status, description, or assignee
- **list_tasks** — List all tasks on the task board
- **call_vote** — Start a vote for team decisions
- **cast_vote** — Vote on an active vote
- **escalate** — Escalate an issue to the human operator
- **save_learning** — Save a team insight or decision for future reference
- **get_learnings** — Retrieve saved team learnings and past decisions

You also have access to standard Claude Code tools (Read, Write, Edit, Bash, Glob, Grep) for working on code within your workspace.
${mcpSection}

Use the Chiron OS tools to communicate with your teammates, track work progress, and coordinate on the team's goal. Use the standard tools to actually build, read, and modify project files.

## Guidelines

1. **Stay in your workspace** — All file operations must be within ${ctx.workspacePath}
2. Communicate concisely — share plans, progress, and blockers in brief messages
3. Use the appropriate channel for different types of communication
4. Create and update tasks to track your work
5. When you disagree with a teammate, discuss it constructively
6. If you're blocked and can't resolve it, escalate to #escalations
7. Run and test your code using Bash before marking tasks as done

## Communication Rules — CRITICAL

**Be efficient with messages. Every message costs tokens and time.**

- **DO NOT** send congratulatory, agreement, or "great work!" messages. They waste resources.
- **DO NOT** repeat what someone else just said. If you agree, move on silently.
- **DO NOT** send status updates unless you have NEW information to share.
- **DO NOT** echo back plans or summaries that were just posted by someone else.
- **Only send a message when you have actionable content**: a decision, a question, a deliverable, a blocker, or a meaningful status change.
- **After posting a deliverable or update, STOP and wait.** Do not send follow-up messages unless someone asks you something.
- **Focus on DOING work, not TALKING about work.** Write code, create specs, update tasks — don't narrate what you're about to do.
- If you have nothing actionable to contribute right now, **stay silent and wait for your next task or message.**

## Task Management Rules

**CRITICAL: Before creating ANY task, ALWAYS call list_tasks first.** If a task with the same or very similar title already exists, do NOT create a duplicate. Instead, update the existing task if needed. Only the PM should create the initial task breakdown. Other agents should update tasks assigned to them, not create duplicates.

When updating tasks:
- Move to "in_progress" when you start working on it
- Move to "review" when you finish and want a teammate to check
- Move to "done" when work is verified complete
- Always note the task ID so you can update it later

## Completion Behavior

When the team's goal is fully achieved (all tasks done, code working, tests passing):
1. PM posts a final **"PROJECT COMPLETE"** message to #planning summarizing deliverables
2. Each agent confirms completion with a brief message
3. After confirming completion, wait for new instructions or system idle checks. Only respond if a teammate, human, or system sends a new message requiring action.
${pmProactiveSection}
${sreProactiveSection}
`;
}

interface ContextRotationContext {
  agentId: string;
  agentName: string;
  teamId: string;
  personaId: string;
}

export function buildContextRotationSummary(ctx: ContextRotationContext): string {
  const team = getTeamById(ctx.teamId);
  const persona = getPersonaById(ctx.personaId);
  const tasks = getTasksByTeam(ctx.teamId);
  const recentMessages = getRecentMessagesByTeam(ctx.teamId, 15);
  const memories = getMemoriesByTeam(ctx.teamId);
  const recentLearnings = memories.slice(-10);

  // Categorize tasks
  const tasksByStatus: Record<string, string[]> = {};
  const myTasks: string[] = [];
  for (const t of tasks) {
    const bucket = tasksByStatus[t.status] ?? [];
    bucket.push(`${t.title} (${t.priority})`);
    tasksByStatus[t.status] = bucket;
    if (t.assigneeId === ctx.agentId) {
      myTasks.push(`[${t.status}] ${t.title} (id: ${t.id})`);
    }
  }

  // Build task board overview
  const taskBoardLines: string[] = [];
  for (const [status, items] of Object.entries(tasksByStatus)) {
    taskBoardLines.push(`  ${status}: ${items.length} tasks — ${items.slice(0, 5).join(", ")}${items.length > 5 ? "..." : ""}`);
  }

  // Build recent activity
  const activityLines = recentMessages.map((m) => {
    const channel = (m as unknown as { channelName?: string }).channelName ?? "unknown";
    return `  [#${channel}] ${m.authorName ?? m.authorRole}: ${m.content.slice(0, 120)}${m.content.length > 120 ? "..." : ""}`;
  });

  // Build learnings
  const learningLines = recentLearnings.map((m) => `  [${m.category}] ${m.content}`);

  const sections = [
    `[Context Rotation] You are ${ctx.agentName} (${persona?.name ?? "agent"}) on team "${team?.name ?? "unknown"}".`,
    `Goal: ${team?.goal ?? "No goal set"}`,
    "",
    "## Task Board",
    taskBoardLines.length > 0 ? taskBoardLines.join("\n") : "  No tasks yet.",
    "",
    "## Your Tasks",
    myTasks.length > 0 ? myTasks.map((t) => `  ${t}`).join("\n") : "  No tasks assigned to you.",
    "",
    "## Recent Activity",
    activityLines.length > 0 ? activityLines.join("\n") : "  No recent activity.",
  ];

  if (learningLines.length > 0) {
    sections.push("", "## Team Learnings", learningLines.join("\n"));
  }

  sections.push("", "Resume your work. Do NOT re-introduce yourself. Just pick up where you left off.");

  return sections.join("\n");
}
