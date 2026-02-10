import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface McpStdioServerConfig {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpHttpServerConfig {
  type?: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
}

export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

export function isHttpMcpServer(s: McpServerConfig): s is McpHttpServerConfig {
  return "url" in s;
}

export interface ChironConfig {
  apiKey?: string;
  defaultModel: string;
  agentModelOverrides: Record<string, string>;
  mcpServers: Record<string, McpServerConfig>;
  maxBudgetUsd?: number;
  idleNudgeIntervalMinutes?: number;
  idleNudgeBudgetThreshold?: number;
  messageQueueMaxSize?: number;
  messageQueueAggregationThreshold?: number;
  contextWindowThreshold?: number;
  maxRuntimeMinutes?: number;
  authToken?: string;
}

const DEFAULT_CONFIG: ChironConfig = {
  defaultModel: "claude-opus-4-6",
  agentModelOverrides: {},
  mcpServers: {},
};

const CONFIG_FILENAME = "config.json";

/**
 * Get the Chiron data directory (~/.chiron).
 */
export function getChironDir(): string {
  return join(homedir(), ".chiron");
}

/**
 * Get the path to ~/.chiron/config.json.
 */
export function findConfigPath(): string {
  return join(getChironDir(), CONFIG_FILENAME);
}

export function loadConfig(): ChironConfig {
  const configPath = join(getChironDir(), CONFIG_FILENAME);
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ChironConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  }

  return { ...DEFAULT_CONFIG };
}

export type ApiKeySource = "config" | "env" | "claude-code" | "none";

/**
 * Probe whether Claude Code CLI can authenticate by spawning a minimal query.
 * Result is cached — only runs once per process. Call early (e.g. server startup)
 * so that subsequent calls resolve instantly from cache.
 */
let _probePromise: Promise<boolean> | null = null;

export function probeClaudeCodeAuth(): Promise<boolean> {
  if (_probePromise) return _probePromise;

  console.log("[AuthProbe] Starting Claude Code auth probe...");
  _probePromise = new Promise((resolve) => {
    import("node:child_process").then(({ spawn }) => {
      const claudePath = join(homedir(), ".local", "bin", "claude");
      const child = spawn(claudePath, ["-p", "ok", "--max-turns", "1"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let exited = false;
      const timer = setTimeout(() => {
        if (!exited) {
          child.kill();
          console.log("[AuthProbe] Probe timed out");
          (globalThis as Record<string, unknown>).__chiron_claude_code_auth = false;
          resolve(false);
        }
      }, 30000);
      child.on("close", (code) => {
        exited = true;
        clearTimeout(timer);
        const result = code === 0;
        console.log(`[AuthProbe] Probe complete: ${result ? "authenticated" : "failed"} (exit code ${code})`);
        (globalThis as Record<string, unknown>).__chiron_claude_code_auth = result;
        resolve(result);
      });
      child.on("error", () => {
        exited = true;
        clearTimeout(timer);
        console.log("[AuthProbe] Probe error: claude CLI not found");
        (globalThis as Record<string, unknown>).__chiron_claude_code_auth = false;
        resolve(false);
      });
    }).catch((e) => {
      console.log(`[AuthProbe] Probe error: ${e}`);
      (globalThis as Record<string, unknown>).__chiron_claude_code_auth = false;
      resolve(false);
    });
  });

  return _probePromise;
}

/**
 * Detect the API key source. Checks config, env, credentials file, and
 * the cached Claude Code CLI probe result. Call probeClaudeCodeAuth()
 * early (e.g. server startup) so the cached result is available here.
 */
export function detectApiKeySource(config: ChironConfig): ApiKeySource {
  if (config.apiKey) return "config";
  if (process.env.ANTHROPIC_API_KEY) return "env";

  // Check credentials file (Linux / older Claude Code)
  const credentialsPath = join(homedir(), ".claude", ".credentials.json");
  if (existsSync(credentialsPath)) {
    try {
      const creds = JSON.parse(readFileSync(credentialsPath, "utf-8"));
      if (creds.apiKey) return "claude-code";
    } catch {
      // Ignore malformed credentials
    }
  }

  // Check cached Claude Code CLI probe (macOS keychain, OAuth, etc.)
  if ((globalThis as Record<string, unknown>).__chiron_claude_code_auth === true) {
    return "claude-code";
  }

  return "none";
}

export function resolveApiKey(config: ChironConfig): string | undefined {
  // Priority 1: Config file
  if (config.apiKey) {
    return config.apiKey;
  }

  // Priority 2: Environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Priority 3: Claude Code local token
  const credentialsPath = join(homedir(), ".claude", ".credentials.json");
  if (existsSync(credentialsPath)) {
    try {
      const creds = JSON.parse(readFileSync(credentialsPath, "utf-8"));
      if (creds.apiKey) {
        return creds.apiKey as string;
      }
    } catch {
      // Ignore malformed credentials
    }
  }

  return undefined;
}
