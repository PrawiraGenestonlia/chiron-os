"use client";

import { useState, useRef } from "react";

interface MessageInputProps {
  channelName: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ channelName, onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        className="flex items-end gap-2 rounded-lg border px-3 py-2"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-gray-500 disabled:opacity-50"
          style={{ color: "var(--foreground)", minHeight: "1.5rem", maxHeight: "8rem" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
