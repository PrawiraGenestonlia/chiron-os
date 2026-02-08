import { getAllPersonas } from "@chiron-os/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PersonasPage() {
  const personas = getAllPersonas();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Personas
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Role templates for AI agents
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-sm rounded-md border transition-colors hover:bg-white/5"
          style={{ borderColor: "var(--border)", color: "var(--secondary-foreground)" }}
        >
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {personas.map((p) => (
          <div
            key={p.id}
            className="p-4 rounded-lg border flex items-start gap-4"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: p.color }}
            >
              {p.shortCode.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" style={{ color: "var(--card-foreground)" }}>
                  {p.name}
                </h3>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                  {p.shortCode}
                </span>
                {p.isDefault && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    default
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
