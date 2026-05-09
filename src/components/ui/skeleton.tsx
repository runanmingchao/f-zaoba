function SkeletonBlock({
  width,
  height = 16,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--bg-card)",
        animation: "shimmer 1.8s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      <SkeletonBlock width="40%" height={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={`${85 + (i % 3) * 5}%`} height={14} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} lines={2 + (i % 2)} />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      <SkeletonBlock width="30%" height={28} style={{ marginBottom: "1.5rem" }} />
      <SkeletonList rows={4} />
    </div>
  );
}
