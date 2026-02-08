# Chiron OS

Local-first orchestration layer for autonomous AI teams.

## Commands

```bash
pnpm dev        # Start development server (port 4173)
pnpm build      # Build all packages
pnpm start      # Start production server (requires pnpm build first)
pnpm lint       # Lint all packages
pnpm test       # Run tests
pnpm db:push    # Push schema changes to SQLite
pnpm db:seed    # Seed default personas
```

## Architecture

- **Monorepo:** Turborepo + PNPM workspaces
- **Frontend:** Next.js 15 + shadcn/ui + Tailwind (`apps/web`)
- **Core Runtime:** Agent orchestration engine (`packages/core`)
- **Database:** SQLite + Drizzle ORM (`packages/db`)
- **Shared:** Types, constants, utilities (`packages/shared`)

## Key Files

- `chiron.config.json` — Local config (API key, MCP servers, model settings). Gitignored.
- `.chiron/chiron.db` — SQLite database. Gitignored.
- `.chiron/workspaces/` — Team workspace directories. Gitignored.

## Conventions

- All IDs use `cuid2`
- Port `4173` for dev server
- Default model: `claude-opus-4-6`
- ESLint + TypeScript strict mode
- `pnpm lint && pnpm build` must pass at all times

## Package Dependencies

```
apps/web → packages/core → packages/db → packages/shared
```

## Current State

### Phase 1 — Foundation (complete)
- [x] Monorepo structure (Turborepo + PNPM)
- [x] Shared types, constants, and utilities (cuid2, config loader)
- [x] Database schema (all 10 tables) and seed (3 default personas)
- [x] Next.js 15 dashboard with REST API (teams, personas, config, channels, messages)
- [x] WebSocket server skeleton
- [x] Dark-theme UI: team list, personas page, config page, team overview
- [x] `pnpm lint && pnpm build` pass clean

### Phase 2 — Agent Runtime (complete)
- [x] AgentRunner class (Claude Agent SDK streaming input mode with AsyncIterable prompt)
- [x] In-process bus MCP server (send_message, read_channel, create_task, update_task, list_tasks)
- [x] Prompt builder from persona templates + team context
- [x] Lifecycle manager (multi-agent orchestration, exponential backoff restarts)
- [x] Message bus engine (EventEmitter-based, channel resolution, message persistence)
- [x] Token tracker (cost recording per agent/team)
- [x] WebSocket wiring (agent:status, agent:stream, team:status events)
- [x] API routes for team start/stop, agent CRUD, agent restart
- [x] Agent status cards UI (real-time via WebSocket, color-coded statuses)
- [x] `pnpm lint && pnpm build` pass clean

### Phase 3 — Dashboard Real-Time (complete)
- [x] Channel sidebar with active channel selection
- [x] Message feed with auto-scroll and loading states
- [x] Message rendering (text, inline code, code blocks, system messages, message type badges)
- [x] `use-messages` hook merging REST history + live WebSocket events
- [x] Human message posting through dashboard (via REST + WebSocket broadcast)
- [x] Message input with Enter-to-send and Shift+Enter for newlines
- [x] Bus message broadcasting (agent messages → WebSocket → dashboard)
- [x] Full-height Slack-like layout with channel sidebar
- [x] `pnpm lint && pnpm build` pass clean

### Phase 4 — Team Collaboration Loop (complete)
- [x] Task API routes (GET/POST list, GET/PUT/DELETE individual) with WebSocket broadcast
- [x] Kanban board UI (6 columns, real-time WS updates, optimistic status changes, inline creation)
- [x] Task card component with priority colors and status change buttons
- [x] `pnpm lint && pnpm build` pass clean

### Phase 5 — Human Governance (complete)
- [x] Escalation manager (voting protocol, deadlock detection, human resolution flow)
- [x] Bus MCP tools: call_vote, cast_vote, escalate (agents can vote and escalate)
- [x] Escalation API routes (list, resolve) with WebSocket broadcast
- [x] Escalation list UI (filter by open/all, inline resolution dialog, vote display)
- [x] Usage API routes (team totals, per-agent breakdown)
- [x] Usage dashboard UI (stat cards, per-agent bar charts, auto-refresh)
- [x] `pnpm lint && pnpm build` pass clean

### Phase 6 — Polish (complete)
- [x] Budget enforcement in TokenTracker (emits budget:exceeded event)
- [x] Team settings page (edit name/goal/workspace, start/stop team, delete team)
- [x] Team DELETE API route
- [x] Escalation manager wired into server.ts with full WebSocket broadcasting
- [x] Config page shows API key source detection (config, env, Claude Code)
- [x] Lifecycle manager has crash recovery (exponential backoff 1s→60s, max 5 attempts)
- [x] Graceful shutdown (SIGINT/SIGTERM → stop all agents → close WS → exit)
- [x] `pnpm lint && pnpm build` pass clean

### Phase 7 — Files & Code Execution (complete)
- [x] Files API routes (listing, content, git operations) with path traversal protection
- [x] File explorer UI (file tree, content viewer, git actions panel)
- [x] Files tab in team sidebar navigation
- [x] Engineer persona prompt enhanced with explicit code execution & testing instructions
- [x] Prompt builder updated with "run and test code" guideline
- [x] E2E tested: created team, agents built todolist app, browsed files, committed via dashboard
- [x] `pnpm lint && pnpm build` pass clean

## All Dashboard Pages

| Page | Path | Status |
|------|------|--------|
| Team List | `/` | Functional |
| Team Overview | `/teams/[teamId]` | Functional |
| Messages | `/teams/[teamId]/messages` | Functional (real-time) |
| Tasks | `/teams/[teamId]/tasks` | Functional (Kanban) |
| Agents | `/teams/[teamId]/agents` | Functional (real-time) |
| Escalations | `/teams/[teamId]/escalations` | Functional (real-time) |
| Usage | `/teams/[teamId]/usage` | Functional (auto-refresh) |
| Files | `/teams/[teamId]/files` | Functional (file tree, content viewer, git) |
| Settings | `/teams/[teamId]/settings` | Functional |
| Personas | `/personas` | Functional |
| Config | `/config` | Functional |

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/teams` | List/create teams |
| GET/PUT/DELETE | `/api/teams/[id]` | Get/update/delete team |
| POST | `/api/teams/[id]/start` | Start team agents |
| POST | `/api/teams/[id]/stop` | Stop team agents |
| GET/POST | `/api/teams/[id]/agents` | List/add agents |
| GET | `/api/teams/[id]/agents/[id]` | Get agent |
| POST | `/api/teams/[id]/agents/[id]/restart` | Restart agent |
| GET/POST | `/api/teams/[id]/channels` | List/create channels |
| GET/POST | `/api/teams/[id]/channels/[id]/messages` | Get/post messages |
| GET/POST | `/api/teams/[id]/tasks` | List/create tasks |
| GET/PUT/DELETE | `/api/teams/[id]/tasks/[id]` | Get/update/delete task |
| GET | `/api/teams/[id]/escalations` | List escalations |
| POST | `/api/teams/[id]/escalations/[id]/resolve` | Resolve escalation |
| GET | `/api/teams/[id]/files` | List workspace files |
| GET | `/api/teams/[id]/files/content` | Read file content |
| POST | `/api/teams/[id]/files/git` | Git operations (init/status/add/commit/remote/push) |
| GET | `/api/teams/[id]/usage` | Team usage totals |
| GET | `/api/teams/[id]/usage/breakdown` | Per-agent breakdown |
| GET/POST | `/api/personas` | List/create personas |
| GET/PUT/DELETE | `/api/personas/[id]` | Get/update/delete persona |
| GET/PUT | `/api/config` | Read/update global config |
