"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/personas", label: "Personas" },
  { href: "/config", label: "Config" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header
      className="shrink-0 flex items-center justify-between px-5 h-12 border-b"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>{">_"}</span>
        <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          Chiron OS
        </span>
      </Link>
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-xs rounded transition-colors hover:bg-white/5"
              style={{
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                backgroundColor: active ? "var(--muted)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
