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

  // Validate mcpServers — only allow known fields
  if (body.mcpServers && typeof body.mcpServers === "object") {
    for (const [name, server] of Object.entries(body.mcpServers)) {
      const s = server as Record<string, unknown>;
      if (!s.command || typeof s.command !== "string") {
        return NextResponse.json(
          { error: `mcpServers.${name}: command must be a non-empty string` },
          { status: 400 }
        );
      }
      if (s.args && !Array.isArray(s.args)) {
        return NextResponse.json(
          { error: `mcpServers.${name}: args must be an array` },
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

  // Write the full config
  const toSave = {
    apiKey: body.apiKey || undefined,
    defaultModel: body.defaultModel,
    agentModelOverrides: body.agentModelOverrides ?? {},
    mcpServers: body.mcpServers ?? {},
    maxBudgetUsd: body.maxBudgetUsd || undefined,
  };

  // Remove undefined keys
  const cleaned = JSON.parse(JSON.stringify(toSave));
  writeFileSync(configPath, JSON.stringify(cleaned, null, 2) + "\n");

  return NextResponse.json({ ok: true });
}
