"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SkeletonPage } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { toast } from "sonner";

interface World {
  id: string;
  name: string;
  narrativeMd: string;
}

export default function WorldPage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [narrativeMd, setNarrativeMd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  function loadWorlds() {
    setError("");
    setLoading(true);
    fetch("/api/worlds")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWorlds(data);
          if (data.length > 0) {
            setSelectedId(data[0].id);
            setName(data[0].name);
            setNarrativeMd(data[0].narrativeMd);
          }
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadWorlds(); }, []);

  // When switching worlds
  function selectWorld(id: string) {
    const w = worlds.find(w => w.id === id);
    if (!w) return;
    setSelectedId(id);
    setName(w.name);
    setNarrativeMd(w.narrativeMd);
    setCreating(false);
    setPreview(false);
  }

  function startNew() {
    setCreating(true);
    setSelectedId("");
    setName("");
    setNarrativeMd("");
    setPreview(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/worlds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: creating ? undefined : selectedId || undefined,
        name: name || "未命名",
        narrativeMd,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setWorlds(prev => {
        const filtered = prev.filter(w => w.id !== data.id);
        return [data, ...filtered];
      });
      setSelectedId(data.id);
      setCreating(false);
    } else {
      const data = await res.json();
      setError(data.error || "保存失败");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个世界吗？")) return;
    try {
      const res = await fetch("/api/worlds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setWorlds(prev => prev.filter(w => w.id !== id));
        if (selectedId === id) {
          setSelectedId("");
        setName("");
        setNarrativeMd("");
      }
      } else {
        toast.error("删除失败，请重试");
      }
    } catch {
      toast.error("网络错误，请检查网络后重试");
    }
  }

  if (loading) return <div style={{ padding: "2rem", maxWidth: "800px" }}><SkeletonPage /></div>;
  if (error && worlds.length === 0) return <div style={{ padding: "2rem", maxWidth: "800px" }}><ErrorDisplay message={error} onRetry={loadWorlds} /></div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", margin: 0 }}>
          🌍 世界观
        </h1>
        <button onClick={startNew} style={{
          padding: "0.4rem 0.85rem",
          background: creating ? "var(--border)" : "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}>
          {creating ? "编辑中" : "+ 新建世界"}
        </button>
      </div>

      {/* World list selector */}
      {worlds.length > 1 && (
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {worlds.map(w => (
            <button
              key={w.id}
              onClick={() => selectWorld(w.id)}
              style={{
                padding: "0.35rem 0.75rem",
                background: selectedId === w.id && !creating ? "var(--accent)" : "var(--bg-card)",
                color: selectedId === w.id && !creating ? "#fff" : "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

      {(selectedId || creating) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              世界名称
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="给这个世界起个名字"
              style={{
                width: "100%",
                padding: "0.65rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                叙事内容 (Markdown)
              </label>
              <button
                onClick={() => setPreview(!preview)}
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                {preview ? "编辑" : "预览"}
              </button>
            </div>

            {preview ? (
              <div style={{
                minHeight: "300px",
                padding: "1rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "0.9rem",
                lineHeight: 1.7,
              }}>
                <ReactMarkdown>{narrativeMd}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                value={narrativeMd}
                onChange={e => setNarrativeMd(e.target.value)}
                rows={18}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
            )}
          </div>

          {error && (
            <p style={{ color: "#c0392b", fontSize: "0.85rem", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSave} disabled={saving || !narrativeMd} style={{
              padding: "0.65rem 1.5rem",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: !narrativeMd ? 0.5 : 1,
              fontSize: "0.9rem",
            }}>
              {saving ? "保存中…" : "保存"}
            </button>
            {!creating && selectedId && (
              <button onClick={() => handleDelete(selectedId)} style={{
                padding: "0.65rem 1rem",
                background: "transparent",
                border: "1px solid #c0392b",
                borderRadius: "8px",
                color: "#c0392b",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}>
                删除
              </button>
            )}
          </div>
        </div>
      )}

      {worlds.length === 0 && !creating && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
          <p style={{ marginBottom: "0.5rem" }}>还没有世界观</p>
          <p style={{ fontSize: "0.85rem" }}>点击"+ 新建世界"创建一个吧</p>
        </div>
      )}
    </div>
  );
}
