"use client";

import { useState, useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { stripThinking, visibleText } from "@/lib/utils/strip-thinking";

interface CompanionInfo {
  id: string;
  name: string;
}

interface Speech {
  companionId: string;
  companionName: string;
  text: string;
}

export default function GroupChatPage() {
  const [companions, setCompanions] = useState<CompanionInfo[]>([]);
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/companions")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCompanions(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [speeches]);

  async function startGroupChat() {
    if (!topic.trim() || running) return;
    setRunning(true);
    setSpeeches([]);

    try {
      const res = await fetch("/api/group-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          provider: localStorage.getItem("socratopia_active_provider") || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setSpeeches(prev => [...prev, { companionId: "error", companionName: "系统", text: `❌ ${text}` }]);
        setRunning(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      const speechMap = new Map<string, string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "speaking") {
              setCurrentSpeaker(data.companionName);
              speechMap.set(data.companionId, "");
              setSpeeches(prev => [...prev, { companionId: data.companionId, companionName: data.companionName, text: "" }]);
            } else if (data.type === "chunk") {
              const current = speechMap.get(data.companionId) || "";
              const raw = current + data.text;
              speechMap.set(data.companionId, raw);
              setSpeeches(prev => prev.map(s =>
                s.companionId === data.companionId ? { ...s, text: visibleText(raw) } : s
              ));
            } else if (data.type === "done_speaking") {
              setCurrentSpeaker(null);
              speechMap.delete(data.companionId);
            } else if (data.type === "done") {
              setCurrentSpeaker(null);
            } else if (data.type === "error") {
              setSpeeches(prev => [...prev, { companionId: "error", companionName: "系统", text: `❌ ${data.error}` }]);
            }
          } catch {
            // SSE parse failures on partial chunks are expected; ignore
          }
        }
      }
    } catch (err) {
      console.error("Group chat stream error:", err);
      setSpeeches(prev => [...prev, { companionId: "error", companionName: "系统", text: `❌ 网络错误: ${err}` }]);
    } finally {
      setRunning(false);
      setCurrentSpeaker(null);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", height: "100vh" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", marginBottom: "1.25rem", flexShrink: 0 }}>
        👥 先贤群聊
      </h1>

      <div style={{
        flex: 1,
        overflowY: "auto",
        marginBottom: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}>
        {speeches.length === 0 && !running && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            输入一个话题，让三位先贤展开讨论
          </div>
        )}

        {speeches.map((s, i) => (
          <div key={i} style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
          }}>
            <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent)", marginBottom: "0.4rem" }}>
              {s.companionName}
            </div>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text)" }}>
              {stripThinking(s.text) || <span style={{ color: "var(--text-muted)" }}>…</span>}
            </div>
          </div>
        ))}

        {currentSpeaker && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 0.5rem" }}>
            {currentSpeaker} 正在发言…
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <div style={{ flexShrink: 0, display: "flex", gap: "0.5rem" }}>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !running) startGroupChat(); }}
          placeholder="输入讨论话题…"
          disabled={running}
          style={{
            flex: 1,
            padding: "0.7rem 1rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            color: "var(--text)",
            fontSize: "0.9rem",
          }}
        />
        <button
          onClick={startGroupChat}
          disabled={running || !topic.trim()}
          style={{
            padding: "0.7rem 1.25rem",
            background: running ? "var(--border)" : "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: running ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          {running ? "讨论中…" : "开始群聊"}
        </button>
      </div>
      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
        {loading ? <Spinner size={12} /> : `参与讨论：${companions.map(c => c.name).join("、")}`}
      </p>
    </div>
  );
}
