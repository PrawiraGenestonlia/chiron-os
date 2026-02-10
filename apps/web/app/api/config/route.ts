import { NextRequest, NextResponse } from "next/server";
import { loadConfig, findConfigPath } from "@chiron-os/shared";
import { writeFileSync } from "node:fs";

export async function GET() {
  const config = loadConfig(process.cwd());
  const configPath = findConfigPath(process.cwd());

  // Return full config including API key (masked) for the UI
  return NextResponse.json({
    ...config,
    apiKey: config.apiKey || "",
    _configPath: configPath,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const configPath = findConfigPath(process.cwd());

  // Validate mcpServers — stdio needs command, HTTP needs url
  if (body.mcpServers && typeof body.mcpServers === "object") {
    for (const [name, server] of Object.entries(body.mcpServers)) {
      const s = server as Record<string, unknown>;
      const hasCommand = s.command && typeof s.command === "string";
      const hasUrl = s.url && typeof s.url === "string";

      if (!hasCommand && !hasUrl) {
        return NextResponse.json(
          { error: `mcpServers.${name}: must have either "command" (stdio) or "url" (HTTP)` },
          { status: 400 }
        );
      }
      if (hasCommand && hasUrl) {
        return NextResponse.json(
          { error: `mcpServers.${name}: cannot have both "command" and "url"` },
          { status: 400 }
        );
      }
      if (hasCommand && s.args && !Array.isArray(s.args)) {
        return NextResponse.json(
          { error: `mcpServers.${name}: args must be an array` },
          { status: 400 }
        );
      }
      if (hasUrl && s.headers && typeof s.headers !== "object") {
        return NextResponse.json(
          { error: `mcpServers.${name}: headers must be an object` },
          { status: 400 }
        );
      }
      if (s.type && !["stdio", "http", "sse"].includes(s.type as string)) {
        return NextResponse.json(
          { error: `mcpServers.${name}: type must be "stdio", "http", or "sse"` },
          { status: 400 }
        );
      }
    }
  }

  // Validate maxBudgetUsd if present
  if (body.maxBudgetUsd !== undefined && body.maxBudgetUsd !== null) {
    if (typeof body.maxBudgetUsd !== "number" || body.maxBudgetUsd < 0) {
      return NextResponse.json(
        { error: "maxBudgetUsd must be a positive number" },
        { status: 400 }
      );
    }
  }

  // Validate idleNudgeIntervalMinutes if present
  if (body.idleNudgeIntervalMinutes !== undefined && body.idleNudgeIntervalMinutes !== null) {
    if (typeof body.idleNudgeIntervalMinutes !== "number" || body.idleNudgeIntervalMinutes < 0) {
      return NextResponse.json(
        { error: "idleNudgeIntervalMinutes must be a number >= 0" },
        { status: 400 }
      );
    }
  }

  // Validate idleNudgeBudgetThreshold if present
  if (body.idleNudgeBudgetThreshold !== undefined && body.idleNudgeBudgetThreshold !== null) {
    if (typeof body.idleNudgeBudgetThreshold !== "number" || body.idleNudgeBudgetThreshold < 0 || body.idleNudgeBudgetThreshold > 1) {
      return NextResponse.json(
        { error: "idleNudgeBudgetThreshold must be a number between 0 and 1" },
        { status: 400 }
      );
    }
  }

  // Validate maxRuntimeMinutes if present
  if (body.maxRuntimeMinutes !== undefined && body.maxRuntimeMinutes !== null) {
    if (typeof body.maxRuntimeMinutes !== "number" || body.maxRuntimeMinutes < 0) {
      return NextResponse.json(
        { error: "maxRuntimeMinutes must be a number >= 0" },
        { status: 400 }
      );
    }
  }

  // Write the full config
  const toSave = {
    apiKey: body.apiKey || undefined,
    defaultModel: body.defaultModel,
    agentModelOverrides: body.agentModelOverrides ?? {},
    mcpServers: body.mcpServers ?? {},
    maxBudgetUsd: body.maxBudgetUsd || undefined,
    idleNudgeIntervalMinutes: body.idleNudgeIntervalMinutes ?? undefined,
    idleNudgeBudgetThreshold: body.idleNudgeBudgetThreshold ?? undefined,
    maxRuntimeMinutes: body.maxRuntimeMinutes ?? undefined,
  };

  // Remove undefined keys
  const cleaned = JSON.parse(JSON.stringify(toSave));
  writeFileSync(configPath, JSON.stringify(cleaned, null, 2) + "\n");

  return NextResponse.json({ ok: true });
}
