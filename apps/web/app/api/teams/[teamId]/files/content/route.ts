import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, statSync } from "node:fs";
import { getWorkspacePath, validateSubpath } from "@/lib/workspace";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib",
  ".woff", ".woff2", ".ttf", ".eot",
]);

function isBinaryFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const url = new URL(request.url);
  const subpath = url.searchParams.get("path");

  if (!subpath) {
    return NextResponse.json({ error: "path parameter is required" }, { status: 400 });
  }

  const workspace = getWorkspacePath(teamId);
  if (!existsSync(workspace)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let resolved: string;
  try {
    resolved = validateSubpath(workspace, subpath);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = statSync(resolved);
  if (stat.isDirectory()) {
    return NextResponse.json({ error: "Path is a directory" }, { status: 400 });
  }

  if (stat.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large", size: stat.size }, { status: 413 });
  }

  if (isBinaryFile(subpath)) {
    return NextResponse.json({ binary: true, size: stat.size, name: subpath });
  }

  try {
    const content = readFileSync(resolved, "utf-8");
    return NextResponse.json({ content, size: stat.size, name: subpath });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
