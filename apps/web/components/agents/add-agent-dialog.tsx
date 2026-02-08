"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

interface Persona {
  id: string;
  name: string;
  shortCode: string;
  color: string;
}

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onAgentAdded: () => void;
}

export function AddAgentDialog({ open, onOpenChange, teamId, onAgentAdded }: AddAgentDialogProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [name, setName] = useState("");
  const [modelOverride, setModelOverride] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/personas")
        .then((r) => r.json())
        .then((data) => setPersonas(data as Persona[]))
        .catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (selectedPersona) {
      setName(selectedPersona.name);
    }
  }, [selectedPersona]);

  function reset() {
    setSelectedPersona(null);
    setName("");
    setModelOverride("");
  }

  async function handleSubmit() {
    if (!selectedPersona || !name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: selectedPersona.id,
          name: name.trim(),
          modelOverride: modelOverride.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast("Agent added", "success");
        onAgentAdded();
        onOpenChange(false);
        reset();
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to add agent", "error");
      }
    } catch {
      toast("Failed to add agent", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogHeader>
        <DialogTitle>Add Agent</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Persona selector */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Persona
          </label>
          <div className="grid grid-cols-3 gap-2">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p)}
                className="text-left p-2 rounded-lg border transition-colors"
                style={{
                  borderColor: selectedPersona?.id === p.id ? p.color : "var(--border)",
                  backgroundColor: selectedPersona?.id === p.id ? `${p.color}15` : "var(--background)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${p.color}20`, color: p.color }}
                >
                  {p.shortCode}
                </span>
                <p className="text-xs mt-1 font-medium" style={{ color: "var(--foreground)" }}>
                  {p.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Agent Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
            className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none focus:border-blue-500"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>

        {/* Model override */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Model Override <span className="normal-case font-normal">(optional)</span>
          </label>
          <input
            value={modelOverride}
            onChange={(e) => setModelOverride(e.target.value)}
            placeholder="default"
            className="w-full text-sm px-3 py-2 rounded border bg-transparent outline-none font-mono focus:border-blue-500"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      <DialogFooter>
        <button
          onClick={() => { onOpenChange(false); reset(); }}
          className="text-sm px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedPersona || !name.trim()}
          className="text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {loading ? "Adding..." : "Add Agent"}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
