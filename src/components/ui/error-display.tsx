export function ErrorDisplay({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "2rem",
        textAlign: "center",
        maxWidth: 400,
        margin: "2rem auto",
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>!</div>
      <p style={{ color: "var(--text)", fontSize: "0.95rem", marginBottom: "1rem" }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "0.5rem 1.25rem",
            background: "transparent",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          重试
        </button>
      )}
    </div>
  );
}
