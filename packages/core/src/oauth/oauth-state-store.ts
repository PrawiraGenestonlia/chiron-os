import { randomBytes } from "node:crypto";
import type { OAuthMetadata } from "./mcp-oauth.js";

export interface OAuthStateEntry {
  serverName: string;
  serverUrl: string;
  codeVerifier: string;
  clientId: string;
  clientSecret?: string;
  metadata: OAuthMetadata;
  createdAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * In-memory store for OAuth flow state.
 * Maps state tokens to flow data. Auto-expires entries after 10 minutes.
 */
export class OAuthStateStore {
  private store = new Map<string, OAuthStateEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Generate a unique state token and store the entry.
   */
  create(entry: Omit<OAuthStateEntry, "createdAt">): string {
    const state = randomBytes(24).toString("base64url");
    this.store.set(state, { ...entry, createdAt: Date.now() });
    return state;
  }

  /**
   * Retrieve and remove a state entry (one-time use).
   */
  consume(state: string): OAuthStateEntry | undefined {
    const entry = this.store.get(state);
    if (!entry) return undefined;

    // Check expiry
    if (Date.now() - entry.createdAt > STATE_TTL_MS) {
      this.store.delete(state);
      return undefined;
    }

    this.store.delete(state);
    return entry;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.createdAt > STATE_TTL_MS) {
        this.store.delete(key);
      }
    }
  }

  shutdown() {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}
