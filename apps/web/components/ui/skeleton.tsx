export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{
        background: "linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}
