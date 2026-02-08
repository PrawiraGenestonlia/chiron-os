"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Persona {
  id: string;
  shortCode: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface MemberEntry {
  personaId: string;
  count: number;
}

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data: Persona[]) => {
        setPersonas(data);
        // Default: 1 of each persona
        setMembers(data.map((p) => ({ personaId: p.id, count: 1 })));
      });
  }, [open]);

  function updateCount(personaId: string, delta: number) {
    setMembers((prev) =>
      prev.map((m) =>
        m.personaId === personaId
          ? { ...m, count: Math.max(0, Math.min(10, m.count + delta)) }
          : m
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const activeMembers = members.filter((m) => m.count > 0);
    if (activeMembers.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || undefined,
          members: activeMembers,
        }),
      });
      if (res.ok) {
        const team = await res.json();
        setName("");
        setGoal("");
        setOpen(false);
        router.push(`/teams/${team.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalAgents = members.reduce((sum, m) => sum + m.count, 0);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium rounded-md text-white transition-colors"
        style={{ backgroundColor: "var(--primary)" }}
      >
        New Team
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg border p-6 shadow-xl"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Create Team
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
              Team Name
            </label>
            <input
              type="text"
              placeholder="e.g. TodoList Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              autoFocus
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
              Goal
            </label>
            <input
              type="text"
              placeholder="e.g. Build a todolist web app with React"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Team Members */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: "var(--muted-foreground)" }}>
              Team Members
              <span className="font-normal ml-2" style={{ color: "var(--muted-foreground)" }}>
                ({totalAgents} agent{totalAgents !== 1 ? "s" : ""})
              </span>
            </label>
            <div className="space-y-2">
              {personas.map((persona) => {
                const entry = members.find((m) => m.personaId === persona.id);
                const count = entry?.count ?? 0;
                return (
                  <div
                    key={persona.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md border"
                    style={{
                      borderColor: count > 0 ? persona.color : "var(--border)",
                      backgroundColor: count > 0 ? `${persona.color}08` : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: persona.color }}
                      />
                      <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {persona.name}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                        {persona.shortCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCount(persona.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded text-sm border transition-colors hover:bg-white/5"
                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                      >
                        -
                      </button>
                      <span
                        className="w-8 text-center text-sm font-mono tabular-nums"
                        style={{ color: count > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}
                      >
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCount(persona.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded text-sm border transition-colors hover:bg-white/5"
                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim() || totalAgents === 0}
            className="px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {loading ? "Creating..." : `Create Team (${totalAgents} agents)`}
          </button>
        </div>
      </form>
    </div>
  );
}
