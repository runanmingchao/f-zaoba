"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <ErrorDisplay
        message={`页面加载失败：${error.message || "未知错误"}`}
        onRetry={reset}
      />
    </div>
  );
}
