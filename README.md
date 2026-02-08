# Chiron OS

Local-first orchestration layer for autonomous AI teams. A single human runs Chiron OS on their machine to spin up teams of AI agents (PM, PD, ENG, and custom roles) that collaborate to build software autonomously.

You manage AI teams like a manager -- monitoring activity, providing feedback, and only intervening on stalemates. Agents debate, self-organize, create their own tasks, and execute real work (writing code, creating designs, planning products). Chiron OS is the orchestration and facilitation layer.

## Features

- **Autonomous agent teams** -- Agents communicate through a Slack-like message bus, create tasks, and coordinate work without human intervention
- **Real-time dashboard** -- Watch agents work in real-time with live message feeds, kanban task boards, and agent status monitoring
- **Customizable roles** -- Ships with PM, PD, and ENG personas; add your own (QA, DevOps, Data Analyst, etc.)
- **Task management** -- Kanban board with automatic task creation, assignment, and status updates by agents
- **Escalation system** -- Agents vote on disagreements; deadlocks auto-escalate to the human operator
- **Cost tracking** -- Per-agent and per-team token usage and cost monitoring
- **MCP tool access** -- Agents use MCP servers (GitHub, Playwright, filesystem, etc.) to interact with external services
- **Local-first** -- Everything runs on your machine. SQLite database, no cloud dependencies

## Prerequisites

- **git**
- **[Claude Code](https://claude.ai/claude-code)** installed and authenticated (recommended -- free, no API key needed)
  - Alternatively, an Anthropic API key

> Node.js and pnpm are installed automatically by `install.sh` if not present.

## Quick Start

```bash
git clone https://github.com/anthropics/chiron-os.git
cd chiron-os
./install.sh
```

The install script checks prerequisites (git, Node.js, pnpm), installs anything missing, sets up the database, seeds default personas, and creates a template config file.

If you have **Claude Code** installed and authenticated, you're ready to go -- no API key needed. Otherwise, configure one:

```bash
# Option A: Edit the generated config file
echo '{ "apiKey": "sk-ant-your-key-here" }' > chiron.config.json

# Option B: Use an environment variable
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

Then start the dev server and open **http://localhost:4173**:

```bash
pnpm dev
```

## Usage

### 1. Create a Team

Click **New Team** on the home page. Give it a name and a goal (e.g., "Build a REST API for a todo app with Express.js"). Select which personas to include and how many of each.

### 2. Start the Team

On the team overview page, click **Start Team**. Agents will begin introducing themselves, discussing the goal, creating tasks, and executing work.

### 3. Monitor Progress

- **Messages** -- Watch agent conversations across channels (#general, #planning, #design, #engineering)
- **Tasks** -- Kanban board shows task progress in real-time
- **Agents** -- See which agents are running, thinking, or using tools
- **Usage** -- Track token consumption and costs

### 4. Intervene When Needed

- Post messages to any channel as the human operator
- Resolve escalations when agents can't agree
- Stop/restart individual agents or the entire team

### 5. Review Deliverables

Agents write code and files to the team's workspace directory at `.chiron/workspaces/<team-id>/`. When the PM posts "PROJECT COMPLETE", the team's work is done.

## Configuration

Chiron OS uses `chiron.config.json` in the project root (gitignored):

```json
{
  "apiKey": "sk-ant-...",
  "defaultModel": "claude-opus-4-6",
  "maxBudgetUsd": 50,
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-github"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `apiKey` | -- | Anthropic API key. Falls back to `ANTHROPIC_API_KEY` env var, then Claude Code credentials. |
| `defaultModel` | `claude-opus-4-6` | Default model for all agents. |
| `maxBudgetUsd` | -- | Optional per-team budget cap in USD. |
| `mcpServers` | `{}` | MCP server configs shared by all agents. |

You can also edit this from the **Config** page in the dashboard.

## Architecture

```
chiron-os/
├── apps/web/              # Next.js 15 dashboard + custom server (WebSocket)
├── packages/core/         # Agent runtime, message bus, lifecycle manager
├── packages/db/           # SQLite + Drizzle ORM (schema, queries, migrations)
└── packages/shared/       # TypeScript types, constants, utilities
```

### How It Works

1. **LifecycleManager** spawns agents as long-lived Claude Agent SDK `query()` calls using `AsyncIterable<SDKUserMessage>` as the prompt (streaming input mode)
2. Each agent gets an **in-process MCP server** (`chiron-bus`) with tools for messaging, task management, voting, and escalation
3. The **MessageBus** broadcasts messages to subscribed agents and WebSocket clients
4. Agents use standard Claude Code tools (Read, Write, Edit, Bash) to work on code in their workspace
5. The **TokenTracker** records costs per API call; the **EscalationManager** handles voting and deadlock detection
6. The Next.js dashboard connects via WebSocket for real-time updates

### Key Design Decisions

- **Personas are database records**, not hardcoded roles -- users can create custom agent types
- **MCP servers are globally configured** -- all agents share the same tool pool
- **Agents stay alive** via the SDK's streaming input mode -- no cold start per interaction
- **SQLite in WAL mode** -- all writes go through the main process for consistency
- **Exponential backoff restarts** -- agents auto-recover from crashes (1s to 60s backoff, max 5 attempts)

## Commands

```bash
pnpm dev        # Start development server (port 4173)
pnpm build      # Build all packages
pnpm start      # Start production server (requires pnpm build first)
pnpm db:push    # Push schema changes to SQLite
pnpm db:seed    # Seed default personas (PM, PD, ENG)
```

## API

Full REST API available at `/api/`:

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/teams` | List or create teams |
| `POST /api/teams/[id]/start` | Start a team's agents |
| `POST /api/teams/[id]/stop` | Stop a team's agents |
| `GET/POST /api/teams/[id]/channels/[id]/messages` | Read or post messages |
| `GET/POST /api/teams/[id]/tasks` | List or create tasks |
| `GET /api/teams/[id]/escalations` | List escalations |
| `GET /api/teams/[id]/usage` | Get usage stats |
| `GET/POST /api/personas` | Manage agent personas |
| `GET/PUT /api/config` | Read/update global config |

WebSocket at `ws://localhost:4173/ws` for real-time events (`message:new`, `agent:status`, `task:updated`, etc.).

## Contributing

Contributions are welcome. Here's how to get started:

1. **Fork and clone** the repository
2. **Run `./install.sh`** to set up dependencies and database
3. **Start developing**: `pnpm dev`
4. **Verify your changes**: `pnpm build` must pass with zero errors before submitting

### Project Structure

- `apps/web/app/` -- Next.js pages and API routes
- `apps/web/components/` -- React components (team, messages, tasks, agents, escalations, usage)
- `apps/web/hooks/` -- Client-side hooks (WebSocket, messages, tasks)
- `packages/core/src/agent/` -- Agent runner, lifecycle manager, prompt builder
- `packages/core/src/bus/` -- Message bus and channel manager
- `packages/core/src/mcp/` -- In-process MCP server with bus tools
- `packages/db/src/schema/` -- Drizzle table definitions
- `packages/db/src/queries/` -- Query helpers per table
- `packages/shared/src/` -- Types, constants, config loader

### Conventions

- **IDs**: `cuid2` for all database records
- **Styling**: CSS variables for theming (`var(--foreground)`, `var(--card)`, etc.), dark theme by default
- **Build gate**: `pnpm build` must pass at all times -- no broken builds
- **Dependencies flow**: `apps/web -> packages/core -> packages/db -> packages/shared`

### Areas for Contribution

- **Git worktrees** -- Parallel workspaces per ENG agent for concurrent development
- **Round-table protocol** -- Structured discussion flow (understanding, proposal, critique, finalization)
- **Shared memory** -- Team knowledge base (MEMORY.md, decision logs)
- **Testing** -- Unit tests for core engines, integration tests for agent flows
- **Performance** -- Message pagination, SQLite query optimization
- **Additional personas** -- QA Engineer, DevOps, Technical Writer templates

## License

MIT
