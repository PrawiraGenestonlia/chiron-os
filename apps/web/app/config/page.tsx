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

const KNOWN_MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", tier: "Most capable" },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", tier: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", tier: "Fastest" },
];

function isStdioServer(
  cfg: McpServerConfig
): cfg is { type?: "stdio"; command: string; args?: string[]; env?: Record<string, string> } {
  return !("url" in cfg);
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [customModel, setCustomModel] = useState(false);

  // MCP server editing state
  const [mcpServers, setMcpServers] = useState<Record<string, McpServerConfig>>({});
  const [addingServer, setAddingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setMcpServers(data.mcpServers ?? {});
        // Check if current model is a known one
        const isKnown = KNOWN_MODELS.some((m) => m.id === data.defaultModel);
        setCustomModel(!isKnown);
      });
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSaved(false);

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

  function handleRemoveServer(name: string) {
    setMcpServers((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  if (!config) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p style={{ color: "var(--muted-foreground)" }}>Loading...</p>
      </div>
    );
  }

  const hasApiKey = !!config.apiKey.trim();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Settings
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Configure how your AI teams operate
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
              Saved
            </span>
          )}
          {error && (
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
              {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href="/"
            className="px-3 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <Section title="API Key" description="Your Anthropic API key for running agents. Leave empty to use Claude Code authentication.">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 text-xs rounded-md border transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          {!hasApiKey && (
            <div
              className="flex items-center gap-2 mt-2 px-3 py-2 rounded text-xs"
              style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60a5fa" }}
            >
              <span>Using Claude Code authentication (auto-detected)</span>
            </div>
          )}
        </Section>

        {/* AI Model */}
        <Section title="AI Model" description="The default model for all agents. Individual agents can override this.">
          {!customModel ? (
            <div className="space-y-2">
              {KNOWN_MODELS.map((model) => (
                <label
                  key={model.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: config.defaultModel === model.id ? "#3b82f6" : "var(--border)",
                    backgroundColor: config.defaultModel === model.id ? "rgba(59,130,246,0.08)" : "var(--background)",
                  }}
                >
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={config.defaultModel === model.id}
                    onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                    className="sr-only"
                  />
                  <span
                    className="w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: config.defaultModel === model.id ? "#3b82f6" : "var(--border)" }}
                  >
                    {config.defaultModel === model.id && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {model.label}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--muted-foreground)" }}>
                      {model.tier}
                    </span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                    {model.id}
                  </span>
                </label>
              ))}
              <button
                onClick={() => setCustomModel(true)}
                className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/5"
                style={{ color: "var(--muted-foreground)" }}
              >
                Use a different model...
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={config.defaultModel}
                onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                placeholder="model-id"
                className="w-full px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={() => {
                  setCustomModel(false);
                  setConfig({ ...config, defaultModel: KNOWN_MODELS[0].id });
                }}
                className="text-xs px-2 py-1 mt-1.5 rounded transition-colors hover:bg-white/5"
                style={{ color: "var(--muted-foreground)" }}
              >
                Back to model list
              </button>
            </div>
          )}
        </Section>

        {/* Spending Limit */}
        <Section title="Spending Limit" description="Set a maximum spend across all agents. Teams stop when the limit is reached.">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={config.maxBudgetUsd ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxBudgetUsd: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="No limit"
              className="w-32 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>USD</span>
          </div>
        </Section>

        {/* Background Monitoring */}
        <Section
          title="Background Monitoring"
          description="When teams are idle, Chiron can periodically nudge agents to check on progress and pick up new work."
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Check every
              </span>
              <div className="flex items-center gap-2">
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
                  className="w-20 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>minutes</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Set to 0 to disable
              </p>
            </div>
            <div>
              <span className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Pause when budget used
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round((config.idleNudgeBudgetThreshold ?? 0.8) * 100)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      idleNudgeBudgetThreshold: e.target.value ? parseFloat(e.target.value) / 100 : undefined,
                    })
                  }
                  className="w-20 px-3 py-2 rounded-md border font-mono text-sm focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>%</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Skip checks when this % of budget is spent
              </p>
            </div>
          </div>
        </Section>

        {/* MCP Servers (Tools) */}
        <Section
          title="Tool Servers"
          description="Connect external tools (MCP servers) that agents can use. For example: GitHub, databases, or custom APIs."
        >
          <div className="space-y-2">
            {Object.entries(mcpServers).map(([name, cfg]) => (
              <McpServerCard
                key={name}
                name={name}
                config={cfg}
                isEditing={editingServer === name}
                onEdit={() => setEditingServer(editingServer === name ? null : name)}
                onSave={(newName, newCfg) => {
                  setMcpServers((prev) => {
                    const next = { ...prev };
                    if (newName !== name) delete next[name];
                    next[newName] = newCfg;
                    return next;
                  });
                  setEditingServer(null);
                }}
                onRemove={() => handleRemoveServer(name)}
              />
            ))}

            {Object.keys(mcpServers).length === 0 && !addingServer && (
              <div
                className="text-center py-6 rounded-lg border border-dashed"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <p className="text-sm">No tool servers connected</p>
                <p className="text-xs mt-1">Add servers to give agents access to external tools</p>
              </div>
            )}

            {addingServer && (
              <McpServerEditor
                onSave={(name, cfg) => {
                  setMcpServers((prev) => ({ ...prev, [name]: cfg }));
                  setAddingServer(false);
                }}
                onCancel={() => setAddingServer(false)}
              />
            )}

            {!addingServer && (
              <button
                onClick={() => setAddingServer(true)}
                className="w-full py-2 text-xs font-medium rounded-lg border border-dashed transition-colors hover:bg-white/5"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                + Add tool server
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-0.5" style={{ color: "var(--card-foreground)" }}>
        {title}
      </h2>
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
        {description}
      </p>
      {children}
    </div>
  );
}

function McpServerCard({
  name,
  config,
  isEditing,
  onEdit,
  onSave,
  onRemove,
}: {
  name: string;
  config: McpServerConfig;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (name: string, config: McpServerConfig) => void;
  onRemove: () => void;
}) {
  const isStdio = isStdioServer(config);
  const serverType = isStdio ? "Local command" : "HTTP endpoint";
  const detail = isStdio ? config.command : (config as { url: string }).url;

  if (isEditing) {
    return (
      <McpServerEditor
        initialName={name}
        initialConfig={config}
        onSave={onSave}
        onCancel={onEdit}
      />
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
          {name}
        </div>
        <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
          {serverType} &middot; <span className="font-mono">{detail}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/5"
          style={{ color: "var(--muted-foreground)" }}
        >
          Edit
        </button>
        <button
          onClick={onRemove}
          className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/5"
          style={{ color: "#ef4444" }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function McpServerEditor({
  initialName = "",
  initialConfig,
  onSave,
  onCancel,
}: {
  initialName?: string;
  initialConfig?: McpServerConfig;
  onSave: (name: string, config: McpServerConfig) => void;
  onCancel: () => void;
}) {
  const isInitiallyStdio = !initialConfig || isStdioServer(initialConfig);
  const [serverName, setServerName] = useState(initialName);
  const [serverType, setServerType] = useState<"stdio" | "http">(isInitiallyStdio ? "stdio" : "http");
  const [command, setCommand] = useState(
    initialConfig && isStdioServer(initialConfig) ? initialConfig.command : ""
  );
  const [args, setArgs] = useState(
    initialConfig && isStdioServer(initialConfig) ? (initialConfig.args ?? []).join(" ") : ""
  );
  const [url, setUrl] = useState(
    initialConfig && !isStdioServer(initialConfig) ? (initialConfig as { url: string }).url : ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit() {
    if (!serverName.trim()) {
      setValidationError("Name is required");
      return;
    }
    if (serverType === "stdio" && !command.trim()) {
      setValidationError("Command is required");
      return;
    }
    if (serverType === "http" && !url.trim()) {
      setValidationError("URL is required");
      return;
    }
    setValidationError(null);

    const cfg: McpServerConfig =
      serverType === "stdio"
        ? {
            command: command.trim(),
            ...(args.trim() ? { args: args.trim().split(/\s+/) } : {}),
          }
        : { type: "http" as const, url: url.trim() };

    onSave(serverName.trim(), cfg);
  }

  const inputStyle = {
    backgroundColor: "var(--background)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.05)" }}
    >
      <div className="flex gap-3">
        <div className="flex-1">
          <span className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
            Name
          </span>
          <input
            autoFocus
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="e.g. github, postgres"
            className="w-full px-3 py-1.5 rounded border text-sm focus:outline-none focus:ring-1"
            style={inputStyle}
          />
        </div>
        <div className="w-40">
          <span className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
            Type
          </span>
          <select
            value={serverType}
            onChange={(e) => setServerType(e.target.value as "stdio" | "http")}
            className="w-full px-3 py-1.5 rounded border text-sm focus:outline-none"
            style={inputStyle}
          >
            <option value="stdio">Local command</option>
            <option value="http">HTTP endpoint</option>
          </select>
        </div>
      </div>

      {serverType === "stdio" ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <span className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
              Command
            </span>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. npx, node, python"
              className="w-full px-3 py-1.5 rounded border text-sm font-mono focus:outline-none focus:ring-1"
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <span className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
              Arguments
            </span>
            <input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g. @modelcontextprotocol/server-github"
              className="w-full px-3 py-1.5 rounded border text-sm font-mono focus:outline-none focus:ring-1"
              style={inputStyle}
            />
          </div>
        </div>
      ) : (
        <div>
          <span className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
            Server URL
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-1.5 rounded border text-sm font-mono focus:outline-none focus:ring-1"
            style={inputStyle}
          />
        </div>
      )}

      {validationError && (
        <p className="text-xs" style={{ color: "#ef4444" }}>{validationError}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {initialName ? "Update" : "Add server"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded transition-colors hover:bg-white/5"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
