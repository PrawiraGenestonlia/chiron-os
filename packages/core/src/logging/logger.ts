import { EventEmitter } from "node:events";
import { createLog, evictOldLogs } from "@chiron-os/db";
import type { LogLevel, LogEvent, LogEntry } from "@chiron-os/shared";

interface PendingLog {
  teamId: string;
  agentId?: string | null;
  level: LogLevel;
  event: LogEvent;
  data?: Record<string, unknown> | null;
  latencyMs?: number | null;
}

export class Logger extends EventEmitter {
  private buffer: PendingLog[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private evictTimer: ReturnType<typeof setInterval> | null = null;
  private teamsWithLogs = new Set<string>();

  constructor() {
    super();
    this.flushTimer = setInterval(() => this.flush(), 1000);
    this.evictTimer = setInterval(() => this.evictAll(), 60_000);
  }

  private log(entry: PendingLog): void {
    this.buffer.push(entry);
    this.teamsWithLogs.add(entry.teamId);
    // Flush immediately if buffer is large
    if (this.buffer.length >= 50) {
      this.flush();
    }
  }

  info(teamId: string, event: LogEvent, data?: Record<string, unknown>, agentId?: string, latencyMs?: number): void {
    this.log({ teamId, agentId, level: "info", event, data, latencyMs });
  }

  warn(teamId: string, event: LogEvent, data?: Record<string, unknown>, agentId?: string, latencyMs?: number): void {
    this.log({ teamId, agentId, level: "warn", event, data, latencyMs });
  }

  error(teamId: string, event: LogEvent, data?: Record<string, unknown>, agentId?: string, latencyMs?: number): void {
    this.log({ teamId, agentId, level: "error", event, data, latencyMs });
  }

  debug(teamId: string, event: LogEvent, data?: Record<string, unknown>, agentId?: string, latencyMs?: number): void {
    this.log({ teamId, agentId, level: "debug", event, data, latencyMs });
  }

  flush(): void {
    if (this.buffer.length === 0) return;
    const entries = this.buffer.splice(0);
    for (const entry of entries) {
      try {
        const row = createLog({
          teamId: entry.teamId,
          agentId: entry.agentId,
          level: entry.level,
          event: entry.event,
          data: entry.data,
          latencyMs: entry.latencyMs,
        });
        this.emit("log:new", row as LogEntry);
      } catch {
        // Silently drop failed log writes
      }
    }
  }

  private evictAll(): void {
    for (const teamId of this.teamsWithLogs) {
      try {
        evictOldLogs(teamId);
      } catch {
        // Ignore eviction errors
      }
    }
  }

  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.evictTimer) {
      clearInterval(this.evictTimer);
      this.evictTimer = null;
    }
    this.flush();
  }
}

let _instance: Logger | null = null;

export function getLogger(): Logger {
  if (!_instance) {
    _instance = new Logger();
  }
  return _instance;
}
