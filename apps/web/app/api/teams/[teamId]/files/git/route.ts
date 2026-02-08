import { NextRequest, NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { getWorkspacePath } from "@/lib/workspace";

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

interface GitAction {
  action: "init" | "status" | "add" | "commit" | "remote" | "push";
  message?: string;
  url?: string;
  files?: string[];
}

function runGit(command: string, cwd: string): { stdout: string; stderr: string } {
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return { stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message: string };
    return {
      stdout: (error.stdout ?? "").trim(),
      stderr: (error.stderr ?? error.message).trim(),
    };
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId } = await context.params;
  const body = (await request.json()) as GitAction;

  const workspace = getWorkspacePath(teamId);
  if (!existsSync(workspace)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  switch (body.action) {
    case "init": {
      const result = runGit("git init", workspace);
      return NextResponse.json({ action: "init", ...result });
    }

    case "status": {
      const result = runGit("git status --porcelain", workspace);
      const files = result.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
          status: line.slice(0, 2).trim(),
          path: line.slice(3),
        }));
      return NextResponse.json({ action: "status", files, raw: result.stdout });
    }

    case "add": {
      const target = body.files?.length ? body.files.join(" ") : ".";
      const result = runGit(`git add ${target}`, workspace);
      return NextResponse.json({ action: "add", ...result });
    }

    case "commit": {
      if (!body.message) {
        return NextResponse.json({ error: "message is required for commit" }, { status: 400 });
      }
      // Ensure user identity is set for the workspace
      runGit('git config user.email "chiron@localhost"', workspace);
      runGit('git config user.name "Chiron OS"', workspace);
      const escaped = body.message.replace(/"/g, '\\"');
      const result = runGit(`git commit -m "${escaped}"`, workspace);
      return NextResponse.json({ action: "commit", ...result });
    }

    case "remote": {
      if (body.url) {
        // Check if remote already exists
        const existing = runGit("git remote -v", workspace);
        if (existing.stdout.includes("origin")) {
          const result = runGit(`git remote set-url origin ${body.url}`, workspace);
          return NextResponse.json({ action: "remote", operation: "set-url", ...result });
        }
        const result = runGit(`git remote add origin ${body.url}`, workspace);
        return NextResponse.json({ action: "remote", operation: "add", ...result });
      }
      const result = runGit("git remote -v", workspace);
      return NextResponse.json({ action: "remote", ...result });
    }

    case "push": {
      const result = runGit("git push -u origin main", workspace);
      // Try HEAD if main fails
      if (result.stderr && result.stderr.includes("error")) {
        const fallback = runGit("git push -u origin HEAD", workspace);
        return NextResponse.json({ action: "push", ...fallback });
      }
      return NextResponse.json({ action: "push", ...result });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
