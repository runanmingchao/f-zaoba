"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { toast } from "sonner";

interface ConvRow {
  id: string;
  companionId: string;
  worldId: string | null;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  companionName: string | null;
  messageCount: number;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");

  function loadConversations() {
    setError(null);
    setLoading(true);
    fetch(`/api/conversations?status=${tab}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setConvs(data);
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadConversations(); }, [tab]);

  async function handleResume(id: string, currentStatus: string) {
    if (currentStatus === "archived") {
      await fetch("/api/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "active" }),
      });
    }
    router.push(`/chat?convId=${id}`);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("确定删除这个对话吗？")) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setConvs(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error("删除失败，请重试");
      }
    } catch {
      toast.error("网络错误，请检查网络后重试");
    }
  }

  function formatDate(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const activeConvs = tab === "active" ? convs : [];
  const archivedConvs = tab === "archived" ? convs : [];
  const displayConvs = tab === "active" ? activeConvs : archivedConvs;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", marginBottom: "1.5rem" }}>
        💬 课堂记录
      </h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {(["active", "archived"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.5rem 1rem",
              background: tab === t ? "var(--accent)" : "var(--bg-card)",
              color: tab === t ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === "active" ? "📖 进行中" : "📦 已存档"}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadConversations} />
      ) : displayConvs.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {tab === "active" ? "没有进行中的课堂，去开始一段对话吧。" : "还没有存档的课堂。"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {displayConvs.map(c => (
            <div
              key={c.id}
              onClick={() => handleResume(c.id, c.status)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text)" }}>
                    {c.title || "未命名对话"}
                  </span>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    fontWeight: 500,
                    background: c.status === "active" ? "rgba(59,130,246,0.15)" : "rgba(156,163,175,0.15)",
                    color: c.status === "active" ? "#3b82f6" : "var(--text-muted)",
                  }}>
                    {c.status === "active" ? "进行中" : "已存档"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <span>{c.companionName || "未知同伴"}</span>
                  <span>{formatDate(c.updatedAt || c.createdAt)}</span>
                  {c.messageCount > 0 && <span>{c.messageCount} 条消息</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleResume(c.id, c.status); }}
                  style={{
                    padding: "0.35rem 0.75rem",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                  }}
                >
                  继续
                </button>
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  style={{
                    padding: "0.35rem 0.65rem",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
