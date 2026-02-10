import { eq } from "drizzle-orm";
import { db, sqlite } from "./client.js";
import { personas } from "./schema/index.js";
import { DEFAULT_PERSONAS, generateId, nowISO } from "@chiron-os/shared";

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    short_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    base_prompt TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'bot',
    color TEXT NOT NULL DEFAULT '#6B7280',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    workspace_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL REFERENCES personas(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    session_id TEXT,
    model_override TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id TEXT,
    author_role TEXT NOT NULL,
    author_name TEXT,
    thread_id TEXT,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS messages_channel_created_idx ON messages(channel_id, created_at);
  CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages(thread_id);

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    parent_task_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS tasks_team_status_idx ON tasks(team_id, status);

  CREATE TABLE IF NOT EXISTS task_dependencies (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS token_usage (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    task_id TEXT,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS token_usage_agent_created_idx ON token_usage(agent_id, created_at);

  CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    message_id TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    votes TEXT,
    resolution TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    agent_id TEXT,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT,
    created_at TEXT NOT NULL
  );
`);

// Seed default personas
const now = nowISO();
for (const persona of DEFAULT_PERSONAS) {
  const existing = db
    .select()
    .from(personas)
    .where(eq(personas.shortCode, persona.shortCode))
    .get();

  if (!existing) {
    db.insert(personas)
      .values({
        id: generateId(),
        shortCode: persona.shortCode,
        name: persona.name,
        description: persona.description,
        basePrompt: persona.basePrompt,
        icon: persona.icon,
        color: persona.color,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    console.log(`Seeded persona: ${persona.name}`);
  } else {
    db.update(personas)
      .set({
        name: persona.name,
        description: persona.description,
        basePrompt: persona.basePrompt,
        icon: persona.icon,
        color: persona.color,
        updatedAt: now,
      })
      .where(eq(personas.shortCode, persona.shortCode))
      .run();
    console.log(`Updated persona: ${persona.name}`);
  }
}

console.log("Seed complete.");
