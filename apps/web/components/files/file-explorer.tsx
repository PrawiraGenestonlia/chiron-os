"use client";

import { useState, useEffect, useCallback } from "react";

interface FileEntry {
  name: string;
  type: "file" | "dir";
  size: number;
  modified: string;
}

interface GitFileStatus {
  status: string;
  path: string;
}

interface FileExplorerProps {
  teamId: string;
}

export function FileExplorer({ teamId }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Git state
  const [gitStatus, setGitStatus] = useState<GitFileStatus[]>([]);
  const [hasGit, setHasGit] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [gitOutput, setGitOutput] = useState("");
  const [gitLoading, setGitLoading] = useState(false);

  const fetchEntries = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/teams/${teamId}/files${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
        // Check if .git exists
        if (path === "" && data.some((e: FileEntry) => e.name === ".git" && e.type === "dir")) {
          setHasGit(true);
        }
      } else {
        setEntries([]);
      }
    } catch {
      setError("Failed to load files");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const fetchGitStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/files/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await res.json();
      if (data.files) {
        setGitStatus(data.files);
        setHasGit(true);
      }
    } catch {
      // Git not initialized
    }
  }, [teamId]);

  useEffect(() => {
    fetchEntries(currentPath);
  }, [currentPath, fetchEntries]);

  useEffect(() => {
    fetchGitStatus();
  }, [fetchGitStatus]);

  async function openFile(name: string) {
    const filePath = currentPath ? `${currentPath}/${name}` : name;
    setSelectedFile(filePath);
    setFileLoading(true);
    setFileContent(null);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/files/content?path=${encodeURIComponent(filePath)}`
      );
      const data = await res.json();
      if (data.binary) {
        setFileContent(`[Binary file: ${data.name} (${formatSize(data.size)})]`);
      } else if (data.content !== undefined) {
        setFileContent(data.content);
      } else {
        setFileContent(`Error: ${data.error ?? "Unknown error"}`);
      }
    } catch {
      setFileContent("Failed to load file");
    } finally {
      setFileLoading(false);
    }
  }

  function navigateTo(path: string) {
    setCurrentPath(path);
    setSelectedFile(null);
    setFileContent(null);
  }

  async function gitAction(action: string, extra?: Record<string, unknown>) {
    setGitLoading(true);
    setGitOutput("");
    try {
      const res = await fetch(`/api/teams/${teamId}/files/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      setGitOutput(data.stdout || data.stderr || JSON.stringify(data));
      if (action === "init") {
        setHasGit(true);
      }
      // Refresh status after mutation
      if (["init", "add", "commit", "push"].includes(action)) {
        fetchGitStatus();
        if (action === "init") fetchEntries(currentPath);
      }
    } catch (e) {
      setGitOutput(e instanceof Error ? e.message : "Git operation failed");
    } finally {
      setGitLoading(false);
    }
  }

  // Breadcrumbs
  const pathParts = currentPath ? currentPath.split("/") : [];
  const breadcrumbs = [
    { label: "workspace", path: "" },
    ...pathParts.map((part, i) => ({
      label: part,
      path: pathParts.slice(0, i + 1).join("/"),
    })),
  ];

  const modifiedCount = gitStatus.filter((f) => f.status === "M").length;
  const addedCount = gitStatus.filter((f) => f.status === "A" || f.status === "??").length;
  const totalChanges = gitStatus.length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: breadcrumbs + git indicator */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="flex items-center gap-1 text-xs overflow-x-auto">
          {breadcrumbs.map((bc, i) => (
            <span key={bc.path} className="flex items-center gap-1">
              {i > 0 && (
                <span style={{ color: "var(--muted-foreground)" }}>/</span>
              )}
              <button
                onClick={() => navigateTo(bc.path)}
                className="hover:underline"
                style={{
                  color:
                    i === breadcrumbs.length - 1
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {bc.label}
              </button>
            </span>
          ))}
        </div>

        {hasGit && (
          <div className="flex items-center gap-2 text-[10px] ml-4 shrink-0">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: totalChanges > 0 ? "#f59e0b" : "#22c55e" }}
            />
            <span style={{ color: "var(--muted-foreground)" }}>
              {totalChanges > 0
                ? `${modifiedCount}M ${addedCount}+ ${totalChanges} changes`
                : "clean"}
            </span>
          </div>
        )}
      </div>

      {/* Main content: file tree + content viewer */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: file list */}
        <div
          className="w-64 shrink-0 border-r overflow-y-auto"
          style={{ borderColor: "var(--border)" }}
        >
          {loading ? (
            <div className="p-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
              Loading...
            </div>
          ) : error ? (
            <div className="p-4 text-xs" style={{ color: "#ef4444" }}>
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
              No files yet. Start the team to generate workspace files.
            </div>
          ) : (
            <div className="py-1">
              {currentPath && (
                <button
                  onClick={() => {
                    const parent = currentPath.split("/").slice(0, -1).join("/");
                    navigateTo(parent);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-white/5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span className="opacity-60">..</span>
                </button>
              )}
              {entries
                .filter((e) => e.name !== ".git")
                .map((entry) => {
                  const filePath = currentPath
                    ? `${currentPath}/${entry.name}`
                    : entry.name;
                  const isSelected = selectedFile === filePath;

                  return (
                    <button
                      key={entry.name}
                      onClick={() => {
                        if (entry.type === "dir") {
                          navigateTo(filePath);
                        } else {
                          openFile(entry.name);
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-white/5 transition-colors"
                      style={{
                        backgroundColor: isSelected ? "var(--muted)" : "transparent",
                        color: "var(--foreground)",
                      }}
                    >
                      <FileIcon type={entry.type} name={entry.name} />
                      <span className="truncate flex-1">{entry.name}</span>
                      {entry.type === "file" && (
                        <span
                          className="text-[10px] shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {formatSize(entry.size)}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right panel: file content */}
        <div className="flex-1 overflow-auto min-w-0">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              <div
                className="px-4 py-2 border-b text-xs shrink-0"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                  backgroundColor: "var(--card)",
                }}
              >
                {selectedFile}
              </div>
              <div className="flex-1 overflow-auto p-4">
                {fileLoading ? (
                  <div
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Loading file...
                  </div>
                ) : (
                  <pre
                    className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {fileContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-full text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Select a file to view its contents
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: git actions */}
      <div
        className="border-t px-4 py-3 shrink-0"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        {!hasGit ? (
          <button
            onClick={() => gitAction("init")}
            disabled={gitLoading}
            className="text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
          >
            {gitLoading ? "..." : "Init Git Repo"}
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Stage all */}
            <button
              onClick={() => gitAction("add")}
              disabled={gitLoading || totalChanges === 0}
              className="text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
            >
              Stage All
            </button>

            {/* Commit */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message..."
                className="text-xs px-2 py-1.5 rounded border outline-none"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  width: 200,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commitMsg.trim()) {
                    gitAction("commit", { message: commitMsg.trim() });
                    setCommitMsg("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (commitMsg.trim()) {
                    gitAction("commit", { message: commitMsg.trim() });
                    setCommitMsg("");
                  }
                }}
                disabled={gitLoading || !commitMsg.trim()}
                className="text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#4ade80" }}
              >
                Commit
              </button>
            </div>

            {/* Separator */}
            <div
              className="h-4 w-px"
              style={{ backgroundColor: "var(--border)" }}
            />

            {/* Remote */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="Remote URL..."
                className="text-xs px-2 py-1.5 rounded border outline-none"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  width: 180,
                }}
              />
              <button
                onClick={() => {
                  if (remoteUrl.trim()) {
                    gitAction("remote", { url: remoteUrl.trim() });
                  }
                }}
                disabled={gitLoading || !remoteUrl.trim()}
                className="text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
              >
                Set Remote
              </button>
            </div>

            {/* Push */}
            <button
              onClick={() => gitAction("push")}
              disabled={gitLoading}
              className="text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#fb923c" }}
            >
              Push
            </button>
          </div>
        )}

        {/* Git output */}
        {gitOutput && (
          <pre
            className="mt-2 text-[10px] max-h-20 overflow-auto p-2 rounded"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {gitOutput}
          </pre>
        )}
      </div>
    </div>
  );
}

function FileIcon({ type, name }: { type: "file" | "dir"; name: string }) {
  const s = {
    width: 14,
    height: 14,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
  };

  if (type === "dir") {
    return (
      <svg {...s} viewBox="0 0 16 16" style={{ color: "#f59e0b" }}>
        <path d="M2 4v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8L6.5 3.5A1 1 0 0 0 5.8 3H3a1 1 0 0 0-1 1z" />
      </svg>
    );
  }

  // Color-code by extension
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  let color = "var(--muted-foreground)";
  if (["ts", "tsx", "js", "jsx"].includes(ext)) color = "#3b82f6";
  else if (["html", "css", "scss"].includes(ext)) color = "#f97316";
  else if (["json", "yaml", "yml", "toml"].includes(ext)) color = "#a78bfa";
  else if (["md", "txt", "rst"].includes(ext)) color = "#6b7280";
  else if (["py", "rb", "go", "rs"].includes(ext)) color = "#10b981";

  return (
    <svg {...s} viewBox="0 0 16 16" style={{ color }}>
      <path d="M4 2h5l4 4v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v4h4" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
