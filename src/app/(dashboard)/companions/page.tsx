"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";

interface Companion {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPreset: boolean;
}

export default function CompanionsPage() {
  const router = useRouter();
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadCompanions() {
    setError(null);
    setLoading(true);
    fetch("/api/companions")
      .then(r => r.json())
      .then(setCompanions)
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCompanions(); }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", margin: 0 }}>
          先贤们
        </h1>
        <button
          onClick={() => router.push("/companions/new")}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          + 创建同伴
        </button>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
        在图书馆中陪伴你的先贤之灵
      </p>
      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadCompanions} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
        {companions.map(c => (
          <div
            key={c.id}
            onClick={() => router.push(`/companions/${c.id}`)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1.25rem",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--accent-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              marginBottom: "0.75rem",
            }}>
              {c.name[0]}
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.25rem" }}>{c.name}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {c.isPreset ? "预设先贤" : "自定义"}
            </p>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
