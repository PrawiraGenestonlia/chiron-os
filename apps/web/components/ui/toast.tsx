"use client";

import { useState, useEffect, useCallback } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

type ToastListener = (item: ToastItem) => void;

// Module-level emitter — no context provider needed
let nextId = 0;
const listeners = new Set<ToastListener>();

export function toast(message: string, variant: ToastVariant = "info") {
  const item: ToastItem = { id: ++nextId, message, variant };
  listeners.forEach((fn) => fn(item));
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(34,197,94,0.15)", border: "#22c55e40", text: "#4ade80" },
  error: { bg: "rgba(239,68,68,0.15)", border: "#ef444440", text: "#f87171" },
  info: { bg: "rgba(59,130,246,0.15)", border: "#3b82f640", text: "#60a5fa" },
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: ToastListener = (item) => {
      setToasts((prev) => [...prev.slice(-2), item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 4000);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: 360 }}>
      {toasts.map((t) => {
        const s = VARIANT_STYLES[t.variant];
        return (
          <div
            key={t.id}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm cursor-pointer"
            style={{
              backgroundColor: s.bg,
              borderColor: s.border,
              color: s.text,
              animation: "slide-in-right 0.2s ease-out",
            }}
            onClick={() => dismiss(t.id)}
          >
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
