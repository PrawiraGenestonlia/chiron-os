import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
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
}

const DEFAULT_CONFIG: ChironConfig = {
  defaultModel: "claude-opus-4-6",
  agentModelOverrides: {},
  mcpServers: {},
};

const CONFIG_FILENAME = "chiron.config.json";

/**
 * Find the path to chiron.config.json by walking up from startDir.
 * Returns the full path if found, or a default path at startDir if not.
 */
export function findConfigPath(startDir: string): string {
  let dir = startDir;
  while (true) {
    const configPath = join(dir, CONFIG_FILENAME);
    if (existsSync(configPath)) return configPath;
    const parent = dirname(dir);
    if (parent === dir) return join(startDir, CONFIG_FILENAME);
    dir = parent;
  }
}

export function loadConfig(projectRoot: string): ChironConfig {
  // Walk up from projectRoot to find chiron.config.json
  let dir = projectRoot;
  while (true) {
    const configPath = join(dir, CONFIG_FILENAME);
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ChironConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }

  return { ...DEFAULT_CONFIG };
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
