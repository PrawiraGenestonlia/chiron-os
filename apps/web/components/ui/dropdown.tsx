"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownMenuProps {
  children: ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block">{children}</div>;
}

interface DropdownTriggerProps {
  children: ReactNode;
  onClick: () => void;
}

export function DropdownTrigger({ children, onClick }: DropdownTriggerProps) {
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  );
}

interface DropdownContentProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "left" | "right";
}

export function DropdownContent({ open, onClose, anchorRef, children, align = "right" }: DropdownContentProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: align === "right" ? rect.right : rect.left,
      });
    }
  }, [open, anchorRef, align]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose, anchorRef]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, handleClickOutside, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] py-1 rounded-lg border shadow-lg"
      style={{
        top: pos.top,
        left: align === "right" ? "auto" : pos.left,
        right: align === "right" ? `calc(100vw - ${pos.left}px)` : "auto",
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
        animation: "dialog-in 0.1s ease-out",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export function DropdownItem({ children, onClick, variant = "default", disabled = false }: DropdownItemProps) {
  const isDanger = variant === "danger";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        color: isDanger ? "#f87171" : "var(--foreground)",
      }}
    >
      {children}
    </button>
  );
}
