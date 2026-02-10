import { existsSync, realpathSync } from "node:fs";
import { join, dirname, resolve, normalize } from "node:path";
import { getChironDir } from "@chiron-os/shared";

/**
 * Get the absolute workspace path for a team.
 */
export function getWorkspacePath(teamId: string): string {
  return join(getChironDir(), "workspaces", teamId);
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
