"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type McpServerConfig =
  | { type?: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type?: "http" | "sse"; url: string; headers?: Record<string, string> };

interface Config {
  apiKey: string;
  defaultModel: string;
  agentModelOverrides: Record<string, string>;
  mcpServers: Record<string, McpServerConfig>;
  maxBudgetUsd?: number;
  idleNudgeIntervalMinutes?: number;
  idleNudgeBudgetThreshold?: number;
  _configPath?: string;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [mcpJson, setMcpJson] = useState("");
  const [mcpError, setMcpError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setMcpJson(JSON.stringify(data.mcpServers ?? {}, null, 2));
      });
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    // Validate MCP JSON
    let mcpServers: Record<string, McpServerConfig> = {};
    try {
      mcpServers = JSON.parse(mcpJson);
      setMcpError(null);
    } catch {
      setMcpError("Invalid JSON");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: config.apiKey,
          defaultModel: config.defaultModel,
          agentModelOverrides: config.agentModelOverrides,
          mcpServers,
          maxBudgetUsd: config.maxBudgetUsd,
          idleNudgeIntervalMinutes: config.idleNudgeIntervalMinutes,
          idleNudgeBudgetThreshold: config.idleNudgeBudgetThreshold,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p style={{ color: "var(--muted-foreground)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Configuration
          </h1>
          <p className="text-sm font-mono" style={{ color: "var(--muted-foreground)" }}>
            {config._configPath ?? "chiron.config.json"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-emerald-400">Saved</span>
          )}
          {error && (
            <span className="text-sm text-red-400">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--secondary-foreground)" }}
          >
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Authentication */}
        <Section title="Authentication">
          <Label text="API Key">
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-ant-... (leave empty to use Claude Code auth)"
                className="flex-1 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </Label>
        </Section>

        {/* Model */}
        <Section title="Model">
          <Label text="Default Model">
            <input
              type="text"
              value={config.defaultModel}
              onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
              className="w-full px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              e.g. claude-opus-4-6, claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001
            </p>
          </Label>
        </Section>

        {/* Budget */}
        <Section title="Budget">
          <Label text="Max Budget (USD)">
            <input
              type="number"
              step="0.01"
              value={config.maxBudgetUsd ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxBudgetUsd: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="No limit"
              className="w-48 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Maximum USD spend across all agents. Leave empty for no limit.
            </p>
          </Label>
        </Section>

        {/* Idle Nudge */}
        <Section title="Idle Nudge (Always-On Agents)">
          <Label text="Nudge Interval (minutes)">
            <input
              type="number"
              min="0"
              step="1"
              value={config.idleNudgeIntervalMinutes ?? 15}
              onChange={(e) =>
                setConfig({
                  ...config,
                  idleNudgeIntervalMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-48 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              How often to nudge idle teams (0 = disabled). Default: 15 minutes.
            </p>
          </Label>
          <Label text="Budget Threshold (0-1)">
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={config.idleNudgeBudgetThreshold ?? 0.8}
              onChange={(e) =>
                setConfig({
                  ...config,
                  idleNudgeBudgetThreshold: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-48 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Skip nudges when team cost exceeds this fraction of max budget. Default: 0.8 (80%).
            </p>
          </Label>
        </Section>

        {/* MCP Servers */}
        <Section title="MCP Servers">
          <Label text="Server Configuration (JSON)">
            <textarea
              value={mcpJson}
              onChange={(e) => {
                setMcpJson(e.target.value);
                try {
                  JSON.parse(e.target.value);
                  setMcpError(null);
                } catch {
                  setMcpError("Invalid JSON");
                }
              }}
              rows={12}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1 resize-y"
              style={{
                backgroundColor: "var(--background)",
                borderColor: mcpError ? "var(--destructive)" : "var(--border)",
                color: "var(--foreground)",
              }}
            />
            {mcpError && (
              <p className="text-xs mt-1 text-red-400">{mcpError}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              {"Stdio: { \"github\": { \"command\": \"npx\", \"args\": [\"...\"] } } — HTTP: { \"ctx\": { \"url\": \"https://...\", \"headers\": { ... } } }"}
            </p>
          </Label>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <h2 className="font-semibold mb-4" style={{ color: "var(--card-foreground)" }}>{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
        {text}
      </span>
      {children}
    </label>
  );
}
