import { existsSync, realpathSync } from "node:fs";
import { join, dirname, resolve, normalize } from "node:path";

/**
 * Find the project root by walking up to find .chiron/ or chiron.config.json
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    if (existsSync(join(dir, ".chiron")) || existsSync(join(dir, "chiron.config.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

/**
 * Get the absolute workspace path for a team.
 */
export function getWorkspacePath(teamId: string): string {
  const root = findProjectRoot();
  return join(root, ".chiron", "workspaces", teamId);
}

/**
 * Validate that a subpath stays within the workspace directory.
 * Returns the resolved absolute path, or throws if path traversal is detected.
 */
export function validateSubpath(workspacePath: string, subpath: string): string {
  const normalized = normalize(subpath);
  const resolved = resolve(workspacePath, normalized);

  // Use realpath if parent exists (to resolve symlinks), otherwise check prefix
  const parentDir = dirname(resolved);
  if (existsSync(parentDir)) {
    const realParent = realpathSync(parentDir);
    const realWorkspace = existsSync(workspacePath) ? realpathSync(workspacePath) : workspacePath;
    if (!realParent.startsWith(realWorkspace) && realParent !== realWorkspace) {
      throw new Error("Path traversal detected");
    }
  } else if (!resolved.startsWith(workspacePath)) {
    throw new Error("Path traversal detected");
  }

  // Also do a basic prefix check on the normalized path
  if (!resolved.startsWith(workspacePath)) {
    throw new Error("Path traversal detected");
  }

  return resolved;
}
