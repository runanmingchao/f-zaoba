"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { toast } from "sonner";

interface Textbook {
  id: string;
  title: string;
  chapterCount: number;
  createdAt: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function loadTextbooks() {
    setError(null);
    setLoading(true);
    fetch("/api/textbooks")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTextbooks(data); })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTextbooks(); }, []);

  async function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    try {
      const res = await fetch("/api/textbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      if (res.ok) {
        const tb = await res.json();
        setTextbooks(prev => [{ id: tb.id, title: title.trim(), chapterCount: tb.chapterCount, createdAt: new Date().toISOString() }, ...prev]);
        setCreating(false);
        setTitle("");
        setContent("");
      } else {
        toast.error("创建教材失败，请重试");
      }
    } catch {
      toast.error("网络错误，请检查网络后重试");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "md"].includes(ext || "")) {
      toast.error("仅支持 .txt 和 .md 文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setContent(text);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsText(file);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("确定删除这本教材吗？")) return;
    try {
      const res = await fetch(`/api/textbooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTextbooks(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error("删除失败，请重试");
      }
    } catch {
      toast.error("网络错误，请检查网络后重试");
    }
  }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", margin: 0 }}>
          📚 教材库
        </h1>
        <button onClick={() => setCreating(!creating)} style={{
          padding: "0.5rem 1rem",
          background: creating ? "var(--border)" : "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}>
          {creating ? "取消" : "+ 添加教材"}
        </button>
      </div>

      {creating && (
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
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="教材名称"
            style={{
              padding: "0.6rem 0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text)",
              fontSize: "0.9rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{
              padding: "0.4rem 0.75rem",
              background: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: "6px",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}>
              📎 上传文件
              <input type="file" accept=".txt,.md" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>支持 .txt / .md</span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="粘贴教材内容（Markdown 格式，用 # 标记章节标题）"
            rows={16}
            style={{
              padding: "0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text)",
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono, monospace)",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={handleCreate} disabled={!title.trim() || !content.trim()} style={{
              padding: "0.5rem 1.25rem",
              background: (title.trim() && content.trim()) ? "var(--accent)" : "var(--border)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: (title.trim() && content.trim()) ? "pointer" : "not-allowed",
              fontSize: "0.85rem",
            }}>
              保存
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadTextbooks} />
      ) : textbooks.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          还没有教材，添加你的第一本教材吧。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {textbooks.map(tb => (
            <div
              key={tb.id}
              onClick={() => router.push(`/library/${tb.id}`)}
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
              <div>
                <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text)" }}>{tb.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  {tb.chapterCount} 章 · {formatDate(tb.createdAt)}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(tb.id, e)}
                style={{
                  padding: "0.3rem 0.6rem",
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
          ))}
        </div>
      )}
    </div>
  );
}
