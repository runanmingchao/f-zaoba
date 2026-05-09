"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { toast } from "sonner";

interface DiaryEntry {
  id: string;
  contentMd: string;
  conversationId: string | null;
  createdAt: string;
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState("");

  function loadEntries() {
    setError(null);
    setLoading(true);
    fetch("/api/diary")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadEntries(); }, []);

  async function handleSave() {
    if (!content.trim()) return;
    const res = await fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentMd: content.trim() }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setEntries(prev => [{ id, contentMd: content.trim(), conversationId: null, createdAt: new Date().toISOString() }, ...prev]);
      setContent("");
      setWriting(false);
    } else {
      toast.error("保存失败，请重试");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这篇日记吗？")) return;
    const res = await fetch("/api/diary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id));
    } else {
      toast.error("删除失败，请重试");
    }
  }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", margin: 0 }}>
          📓 学习日记
        </h1>
        <button onClick={() => setWriting(!writing)} style={{
          padding: "0.5rem 1rem",
          background: writing ? "var(--border)" : "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}>
          {writing ? "取消" : "+ 写日记"}
        </button>
      </div>

      {writing && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="今天学到了什么？记录你的思考…（支持 Markdown）"
            rows={12}
            style={{
              padding: "0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text)",
              fontSize: "0.9rem",
              resize: "vertical",
            }}
          />
          <button onClick={handleSave} disabled={!content.trim()} style={{
            padding: "0.5rem 1.25rem",
            background: content.trim() ? "var(--accent)" : "var(--border)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: content.trim() ? "pointer" : "not-allowed",
            fontSize: "0.85rem",
            alignSelf: "flex-end",
          }}>
            保存
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={2} />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadEntries} />
      ) : entries.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          还没有日记，写下你的第一篇学习日记吧。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1.25rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{formatDate(entry.createdAt)}</span>
                <button onClick={() => handleDelete(entry.id)} style={{
                  padding: "0.25rem 0.5rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                }}>
                  删除
                </button>
              </div>
              <div className="markdown-content" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
                <ReactMarkdown>{entry.contentMd}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
