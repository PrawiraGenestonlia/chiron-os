"use client";

import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <button
          onClick={() => onOpenChange(false)}
          className="text-sm px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
          style={{
            backgroundColor: isDanger ? "rgba(239,68,68,0.15)" : "var(--primary)",
            color: isDanger ? "#f87171" : "var(--primary-foreground)",
          }}
        >
          {loading ? "..." : confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
