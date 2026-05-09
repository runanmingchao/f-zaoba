"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SkeletonPage } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";

interface World {
  id: string;
  name: string;
  narrativeMd: string;
  theme?: string;
}

const STYLE_OPTIONS = [
  { value: "default", label: "🏛️ 经典", color: "#b8860b" },
  { value: "cyberpunk", label: "🌃 科幻", color: "#00ffc8" },
  { value: "cool", label: "🔥 酷炫", color: "#e91e63" },
  { value: "minimal", label: "⬜ 简约", color: "#2d2d2d" },
  { value: "anime", label: "🌸 二次元", color: "#ff69b4" },
  { value: "nature", label: "🌿 自然", color: "#228b22" },
];

export default function WorldPage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [narrativeMd, setNarrativeMd] = useState("");
  const [theme, setTheme] = useState("default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  function loadWorlds() {
    setError("");
    setLoading(true);
    Promise.all([
      fetch("/api/worlds").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([data, me]) => {
        if (Array.isArray(data)) {
          setWorlds(data);
          if (data.length > 0) {
            setSelectedId(data[0].id);
            setName(data[0].name);
            setNarrativeMd(data[0].narrativeMd);
            setTheme(data[0].theme || "default");
          }
        }
        if (me.user?.activeWorldId) setActiveWorldId(me.user.activeWorldId);
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
    setTheme(w.theme || "default");
    setCreating(false);
    setPreview(false);
  }

  function startNew() {
    setCreating(true);
    setSelectedId("");
    setName("");
    setNarrativeMd("");
    setTheme("default");
    setPreview(false);
  }

  async function activateWorld(worldId: string) {
    const res = await fetch("/api/worlds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activateId: worldId }),
    });
    if (res.ok) {
      setActiveWorldId(worldId);
      // Apply the world's style immediately
      const w = worlds.find(w => w.id === worldId);
      document.documentElement.setAttribute("data-style", w?.theme || "default");
    }
  }

  async function handleExpand() {
    if (!narrativeMd.trim() || expanding) return;
    setExpanding(true);
    setError("");

    try {
      const res = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narrativeMd, type: "world" }),
      });

      if (!res.ok) { setError("扩写失败"); setExpanding(false); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = narrativeMd;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk") {
              accumulated += data.text;
              setNarrativeMd(accumulated);
            } else if (data.type === "done") {
              if (data.expandedText) setNarrativeMd(data.expandedText);
            }
          } catch {}
        }
      }
    } catch {
      setError("扩写失败");
    } finally {
      setExpanding(false);
    }
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
        theme,
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
      // Apply style if this is the active world
      if (data.id === activeWorldId) {
        document.documentElement.setAttribute("data-style", data.theme || "default");
      }
    } else {
      const data = await res.json();
      setError(data.error || "保存失败");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个世界吗？")) return;
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
      {worlds.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
          {worlds.map(w => {
            const isActive = w.id === activeWorldId;
            const isSelected = selectedId === w.id && !creating;
            const styleInfo = STYLE_OPTIONS.find(s => s.value === (w.theme || "default"));
            return (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <button
                  onClick={() => selectWorld(w.id)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    background: isSelected ? "var(--accent)" : "var(--bg-card)",
                    color: isSelected ? "#fff" : "var(--text)",
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  {isActive && <span style={{ marginRight: "0.25rem" }}>●</span>}{w.name}
                  {styleInfo && !isSelected && (
                    <span style={{ marginLeft: "0.35rem", opacity: 0.7, fontSize: "0.75rem" }}>
                      {styleInfo.label.split(" ")[0]}
                    </span>
                  )}
                </button>
                {!isActive && (
                  <button
                    onClick={() => activateWorld(w.id)}
                    title="设为当前世界"
                    style={{
                      padding: "0.15rem 0.5rem",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.65rem",
                    }}
                  >
                    启用
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(selectedId || creating) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "1rem" }}>
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
              <label style={{ display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                UI 风格
              </label>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {STYLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  叙事内容 (Markdown)
                </label>
                <button
                  onClick={handleExpand}
                  disabled={expanding || !narrativeMd.trim()}
                  title="让 AI 帮你扩展和润色世界叙事"
                  style={{
                    padding: "0.2rem 0.55rem",
                    background: expanding ? "var(--border)" : "transparent",
                    border: "1px solid var(--accent)",
                    borderRadius: "6px",
                    color: expanding ? "var(--text-muted)" : "var(--accent)",
                    cursor: expanding ? "not-allowed" : "pointer",
                    fontSize: "0.7rem",
                  }}
                >
                  {expanding ? "扩写中…" : "✨ AI 扩写"}
                </button>
              </div>
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
