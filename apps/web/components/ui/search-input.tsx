"use client";

import { useState, useEffect, useRef } from "react";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function SearchInput({
  placeholder = "Search...",
  value: externalValue,
  onChange,
  debounceMs = 300,
}: SearchInputProps) {
  const [internal, setInternal] = useState(externalValue ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalValue !== undefined) setInternal(externalValue);
  }, [externalValue]);

  function handleChange(v: string) {
    setInternal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounceMs);
  }

  function handleClear() {
    setInternal("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
  }

  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        width={14}
        height={14}
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" />
      </svg>
      <input
        type="text"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm pl-8 pr-7 py-1.5 rounded border bg-transparent outline-none focus:border-blue-500"
        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
      />
      {internal && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs leading-none"
          style={{ color: "var(--muted-foreground)" }}
        >
          &times;
        </button>
      )}
    </div>
  );
}
