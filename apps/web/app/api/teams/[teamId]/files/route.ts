import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getWorkspacePath, validateSubpath } from "@/lib/workspace";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const url = new URL(request.url);
  const subpath = url.searchParams.get("path") ?? "";

  const workspace = getWorkspacePath(teamId);
  if (!existsSync(workspace)) {
    return NextResponse.json([]);
  }

  let resolved: string;
  try {
    resolved = subpath ? validateSubpath(workspace, subpath) : workspace;
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json([]);
  }

  try {
    const entries = readdirSync(resolved);
    const items = entries.map((name) => {
      const fullPath = join(resolved, name);
      try {
        const stat = statSync(fullPath);
        return {
          name,
          type: stat.isDirectory() ? ("dir" as const) : ("file" as const),
          size: stat.size,
          modified: stat.mtime.toISOString(),
        };
      } catch {
        return { name, type: "file" as const, size: 0, modified: "" };
      }
    });

    // Sort: directories first, then alphabetical
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to read directory" }, { status: 500 });
  }
}
