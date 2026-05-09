"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      <ErrorDisplay
        message={`页面加载失败：${error.message || "未知错误"}`}
        onRetry={reset}
      />
    </div>
  );
}
