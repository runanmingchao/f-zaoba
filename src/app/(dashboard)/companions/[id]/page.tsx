"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

interface Companion {
  id: string;
  name: string;
  personaMd: string;
  avatarUrl: string | null;
  isPreset: boolean;
}

export default function CompanionEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [name, setName] = useState("");
  const [personaMd, setPersonaMd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/companions/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setCompanion(data);
        setName(data.name);
        setPersonaMd(data.personaMd);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      if (isNew) {
        const res = await fetch("/api/companions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, personaMd }),
        });
        if (res.ok) {
          const data = await res.json();
          router.push(`/companions/${data.id}`);
        } else {
          const data = await res.json();
          setError(data.error || "创建失败");
        }
      } else {
        const res = await fetch("/api/companions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name, personaMd }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "保存失败");
        }
      }
    } catch {
      setError("网络错误，请检查网络后重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("确定删除这个同伴吗？")) return;
    try {
      const res = await fetch(`/api/companions/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/companions");
      } else {
        const data = await res.json();
        setError(data.error || "删除失败");
      }
    } catch {
      setError("网络错误，请检查网络后重试");
    }
  }

  if (loading) return <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}><Spinner size={28} /></div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "720px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", marginBottom: "1.5rem" }}>
        {isNew ? "🧑‍🏫 创建新同伴" : "🧑‍🏫 编辑同伴"}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            同伴名称
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="给你的同伴取个名字"
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
            人格设定 (Markdown)
          </label>
          <textarea
            value={personaMd}
            onChange={e => setPersonaMd(e.target.value)}
            placeholder="用 Markdown 描述同伴的性格、说话风格、情绪表达…"
            rows={20}
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
        </div>

        {error && (
          <p style={{ color: "#c0392b", fontSize: "0.85rem", margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={handleSave} disabled={saving || !name || !personaMd} style={{
            padding: "0.65rem 1.5rem",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: (!name || !personaMd) ? 0.5 : 1,
            fontSize: "0.9rem",
          }}>
            {saving ? "保存中…" : "保存"}
          </button>

          {!isNew && companion && !companion.isPreset && (
            <button onClick={handleDelete} style={{
              padding: "0.65rem 1.5rem",
              background: "transparent",
              color: "#c0392b",
              border: "1px solid #c0392b",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}>
              删除同伴
            </button>
          )}

          <button onClick={() => router.back()} style={{
            padding: "0.65rem 1.5rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}>
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
