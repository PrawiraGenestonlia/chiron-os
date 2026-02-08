"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Content */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 rounded-lg border p-6 shadow-xl"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
          animation: "dialog-in 0.15s ease-out",
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes dialog-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
      {children}
    </p>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}
