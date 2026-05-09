"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Spinner } from "@/components/ui/spinner";
import { stripThinking, visibleText } from "@/lib/utils/strip-thinking";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  companionName?: string;
  companionId?: string;
}

interface Companion {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPreset: boolean;
}

interface Textbook {
  id: string;
  title: string;
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const convIdParam = searchParams.get("convId");

  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);
  const [worlds, setWorlds] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string>("");
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState<string>("");
  const [teachingMode, setTeachingMode] = useState<"progressive" | "aggressive" | "exercise">("progressive");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingCompanion, setStreamingCompanion] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [recentConvs, setRecentConvs] = useState<{ id: string; title: string; companionName: string | null }[]>([]);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const streamingRawRef = useRef("");

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target as Node)) {
        setHistoryDropdownOpen(false);
      }
    }
    if (dropdownOpen || historyDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen, historyDropdownOpen]);

  function loadChatData() {
    setDataError(null);
    setDataLoading(true);
    Promise.all([
      fetch("/api/companions").then(r => r.json()),
      fetch("/api/worlds").then(r => r.json()),
      fetch("/api/textbooks").then(r => r.json()),
    ]).then(([compData, worldData, tbData]) => {
      if (Array.isArray(compData)) {
        setCompanions(compData);
        if (!convIdParam && compData.length > 0) {
          setSelectedCompanionIds([compData[0].id]);
        }
      }
      if (Array.isArray(worldData)) setWorlds(worldData);
      if (Array.isArray(tbData)) setTextbooks(tbData);
    }).catch(() => setDataError("加载失败，请重试"))
    .finally(() => setDataLoading(false));
  }

  useEffect(() => { loadChatData(); }, [convIdParam]);

  // Auto-resume: if no convId, load most recent active conversation
  useEffect(() => {
    if (!convIdParam && !dataLoading && !historyLoaded) {
      fetch("/api/conversations?status=active")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setRecentConvs(data.slice(0, 5));
            router.replace(`/chat?convId=${data[0].id}`);
          } else {
            setRecentConvs([]);
            setHistoryLoaded(true); // mark as loaded even though empty
          }
        })
        .catch((err) => {
          console.error("Failed to auto-resume conversation:", err);
          setHistoryLoaded(true);
        })
    }
  }, [convIdParam, dataLoading, historyLoaded]);

  // Refresh recent conversations list
  useEffect(() => {
    fetch("/api/conversations?status=active")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRecentConvs(data.slice(0, 5));
      })
      .catch((err) => {
        console.error("Failed to refresh conversation list:", err);
      });
  }, [messages.length]);

  // Load conversation history
  useEffect(() => {
    if (!convIdParam || historyLoaded) return;
    fetch(`/api/conversations/${convIdParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        setConversationId(data.id);
        if (data.mode) setTeachingMode(data.mode);
        if (data.messages && data.messages.length > 0) {
          // Build companion name map from messages
          const companionNames = new Map<string, string>();
          const msgs = data.messages.map((m: { id: string; role: string; content: string; companionId?: string; companionName?: string }) => {
            if (m.companionName && m.companionId) {
              companionNames.set(m.companionId, m.companionName);
            }
            return {
              id: m.id,
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
              companionName: m.companionName || undefined,
              companionId: m.companionId || undefined,
            };
          });
          setMessages(msgs);
          if (companionNames.size > 1) {
            setSelectedCompanionIds(Array.from(companionNames.keys()));
          }
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [convIdParam, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function toggleCompanion(id: string) {
    setSelectedCompanionIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Must have at least 1
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) return prev; // Max 3
      return [...prev, id];
    });
  }

  async function sendMessage() {
    if (!input.trim() || streaming || selectedCompanionIds.length === 0) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setStreamingCompanion("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionIds: selectedCompanionIds,
          message: userMsg.content,
          conversationId,
          textbookId: selectedTextbook || undefined,
          worldId: selectedWorld || undefined,
          mode: teachingMode,
          provider: localStorage.getItem("socratopia_active_provider") || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `❌ ${text}` }]);
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "speaking") {
              setStreamingCompanion(data.companionName);
              setStreamingText("");
              streamingRawRef.current = "";
            } else if (data.type === "chunk") {
              setStreamingCompanion(data.companionName);
              streamingRawRef.current += data.text;
              setStreamingText(visibleText(streamingRawRef.current));
            } else if (data.type === "done_speaking") {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "assistant",
                content: data.fullText as string,
                companionName: data.companionName as string,
                companionId: data.companionId as string,
              }]);
              setStreamingText("");
              setStreamingCompanion("");
              setSaved(true);
              setTimeout(() => setSaved(false), 2500);
            } else if (data.type === "done") {
              if (data.conversationId) setConversationId(data.conversationId as string);
            } else if (data.type === "error") {
              setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `❌ ${data.error}` }]);
              setStreamingText("");
            }
          } catch {
            // SSE parse failures on partial chunks are expected; ignore
          }
        }
      }
    } catch (err) {
      console.error("Chat stream error:", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `❌ 网络错误: ${err}` }]);
    } finally {
      setStreaming(false);
      setStreamingCompanion("");
    }
  }

  async function handleEndClass() {
    if (!conversationId) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversationId, status: "archived" }),
      });
      if (!res.ok) throw new Error("存档失败");
      setMessages([]);
      setConversationId(null);
      setHistoryLoaded(true);
      router.replace("/chat");
      toast.success("课堂已存档，可在「对话」中继续");
    } catch {
      toast.error("存档失败，请重试");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top bar */}
      <div style={{
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {/* Multi-select companions dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={dataLoading}
            style={{
              padding: "0.45rem 0.85rem",
              background: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              cursor: dataLoading ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minWidth: "140px",
              opacity: dataLoading ? 0.5 : 1,
            }}
          >
            <span>{dataLoading ? <Spinner size={14} /> : null} 🧑‍🏫 {dataLoading ? "加载中…" : selectedCompanionIds.length === 0 ? "选择老师" : `已选 ${selectedCompanionIds.length}/3`}</span>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>▼</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.35rem",
              zIndex: 50,
              minWidth: "180px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              {companions.map(c => {
                const sel = selectedCompanionIds.includes(c.id);
                const canToggle = sel ? selectedCompanionIds.length > 1 : selectedCompanionIds.length < 3;
                return (
                  <label
                    key={c.id}
                    onClick={() => { if (canToggle) toggleCompanion(c.id); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "6px",
                      cursor: canToggle ? "pointer" : "not-allowed",
                      opacity: canToggle ? 1 : 0.4,
                      fontSize: "0.85rem",
                      color: "var(--text)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {}}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span>{c.name}</span>
                    {c.isPreset && <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>预设</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {worlds.length > 0 && (
          <select
            value={selectedWorld}
            onChange={e => setSelectedWorld(e.target.value)}
            style={{
              background: selectedWorld ? "var(--accent-light)" : "var(--bg-card)",
              color: selectedWorld ? "var(--accent)" : "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
            }}
          >
            <option value="">🌍 世界观</option>
            {worlds.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}

        {textbooks.length > 0 && (
          <select
            value={selectedTextbook}
            onChange={e => setSelectedTextbook(e.target.value)}
            style={{
              background: selectedTextbook ? "var(--accent-light)" : "var(--bg-card)",
              color: selectedTextbook ? "var(--accent)" : "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
            }}
          >
            <option value="">📚 选教材</option>
            {textbooks.map(tb => (
              <option key={tb.id} value={tb.id}>{tb.title}</option>
            ))}
          </select>
        )}

        <select
          value={teachingMode}
          onChange={e => setTeachingMode(e.target.value as typeof teachingMode)}
          style={{
            background: teachingMode !== "progressive" ? "var(--accent-light)" : "var(--bg-card)",
            color: teachingMode !== "progressive" ? "var(--accent)" : "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.35rem 0.75rem",
            fontSize: "0.8rem",
          }}
        >
          <option value="progressive">🐢 渐进式</option>
          <option value="aggressive">🐇 激进式</option>
          <option value="exercise" disabled={!selectedTextbook}>✏️ 习题课{!selectedTextbook ? " (需先选教材)" : ""}</option>
        </select>

        {/* Spacer to push right-side buttons if needed */}
        <div style={{ flex: 1 }} />

        {/* History dropdown */}
        {recentConvs.length > 0 && (
          <div ref={historyDropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
              style={{
                padding: "0.35rem 0.75rem",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              历史课堂 ▼
            </button>
            {historyDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.35rem",
                zIndex: 50,
                minWidth: "240px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                {recentConvs.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setHistoryDropdownOpen(false);
                      router.push(`/chat?convId=${c.id}`);
                    }}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "var(--text)",
                      fontSize: "0.8rem",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontWeight: 500 }}>{c.title || "未命名对话"}</div>
                    {c.companionName && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{c.companionName}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <>
            <button onClick={() => { setMessages([]); setConversationId(null); setHistoryLoaded(true); setTeachingMode("progressive"); router.replace("/chat"); }} style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.35rem 0.75rem",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}>
              新课
            </button>
            {conversationId && (
              <button onClick={handleEndClass} style={{
                background: "var(--accent)",
                border: "none",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}>
                下课
              </button>
            )}
          </>
        )}
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}>
        {messages.length === 0 && !streaming && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            gap: "0.5rem",
          }}>
            <p style={{ fontSize: "1.2rem", fontFamily: "var(--font-heading)" }}>
              有什么想问的吗？
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              点击上方老师头像选择 1-3 位，开始圆桌教学
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            companionName={msg.companionName}
            companionId={msg.companionId}
            selectedCompanionIds={selectedCompanionIds}
          />
        ))}

        {streaming && streamingText && (
          <ChatBubble role="assistant" content={streamingText} companionName={streamingCompanion} />
        )}

        {streaming && !streamingText && (
          <div style={{
            display: "flex",
            justifyContent: "flex-start",
            padding: "0 0.5rem",
          }}>
            <div style={{
              background: "var(--bubble-assistant)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}>
              正在思考…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "1rem 1.5rem",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedCompanionIds.length > 1 ? "向老师们提问…" : "输入你的问题…"}
            disabled={streaming}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text)",
              fontSize: "0.95rem",
              fontFamily: "var(--font-body)",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim() || selectedCompanionIds.length === 0}
            style={{
              padding: "0.75rem 1.5rem",
              background: streaming ? "var(--border)" : "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: streaming ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            {streaming ? "…" : "发送"}
          </button>
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
          已选 {selectedCompanionIds.length}/3 位老师
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", color: "var(--text-muted)" }}>加载中…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}

const TEACHER_COLORS = ["#4a90d9", "#3d8b5e", "#c87a2a"];

function ChatBubble({ role, content, companionName, companionId, selectedCompanionIds }: {
  role: "user" | "assistant" | "system";
  content: string;
  companionName?: string;
  companionId?: string;
  selectedCompanionIds?: string[];
}) {
  const displayContent = role === "assistant" ? stripThinking(content) : content;
  let teacherColorIndex = -1;
  if (companionId && selectedCompanionIds) {
    teacherColorIndex = selectedCompanionIds.indexOf(companionId);
  }
  const accentColor = teacherColorIndex >= 0 ? TEACHER_COLORS[teacherColorIndex % TEACHER_COLORS.length] : null;
  const isTeacher = role === "assistant" && companionName;
  const isUser = role === "user";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      padding: "0 0.5rem",
    }}>
      {/* Teacher name label */}
      {isTeacher && (
        <span style={{
          fontSize: "0.7rem",
          color: accentColor || "var(--text-muted)",
          marginBottom: "0.2rem",
          fontWeight: 500,
        }}>
          {companionName}
        </span>
      )}

      <div style={{
        maxWidth: "75%",
        background: isUser ? "var(--accent)" : "var(--bubble-assistant)",
        color: isUser ? "#fff" : "var(--text)",
        borderLeft: isTeacher && accentColor ? `3px solid ${accentColor}` : undefined,
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "0.65rem 0.9rem",
        fontSize: "0.9rem",
        lineHeight: 1.65,
      }}>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {displayContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
