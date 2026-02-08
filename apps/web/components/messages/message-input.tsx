"use client";

import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  channelName: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ channelName, onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="border-t px-4 py-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <div
        className="flex items-end gap-2 rounded-lg border px-3 py-2 transition-colors"
        style={{
          borderColor: value.trim() ? "#3b82f6" : "var(--border)",
          backgroundColor: "var(--background)",
        }}
      >
        <div
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold self-start mt-0.5"
          style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}
        >
          You
        </div>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Reply in #${channelName}... (your agents will see this)`}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-gray-500 disabled:opacity-50"
          style={{ color: "var(--foreground)", minHeight: "1.5rem", maxHeight: "10rem" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-20"
          style={{
            backgroundColor: value.trim() ? "var(--primary)" : "var(--muted)",
            color: value.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
          }}
        >
          Send
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: "var(--muted)" }}>Enter</kbd> to send
          {" "}
          <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: "var(--muted)" }}>Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
