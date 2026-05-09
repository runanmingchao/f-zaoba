"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ErrorDisplay } from "@/components/ui/error-display";

interface Textbook {
  id: string;
  title: string;
  parsedContent: string;
  chapterCount: number;
}

interface Exercise {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
}

export default function TextbookReaderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"content" | "exercises">("content");

  // Exercise state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exLoading, setExLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null);

  // Batch import state
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchQuestionsContent, setBatchQuestionsContent] = useState("");
  const [batchQuestionsDocName, setBatchQuestionsDocName] = useState("");
  const [batchAnswers, setBatchAnswers] = useState<{ name: string; content: string }[]>([]);
  const [batchParsing, setBatchParsing] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  function loadTextbook() {
    setError(null);
    setLoading(true);
    fetch(`/api/textbooks/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTextbook(data);
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTextbook(); }, [id]);

  useEffect(() => {
    if (tab === "exercises") {
      setExLoading(true);
      fetch(`/api/textbooks/${id}/exercises`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setExercises(data); })
        .finally(() => setExLoading(false));
    }
  }, [tab, id]);

  async function handleAddExercise() {
    if (!newQuestion.trim()) return;
    try {
      const res = await fetch(`/api/textbooks/${id}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          topic: newTopic.trim() || null,
        }),
      });
      if (res.ok) {
        const ex = await res.json();
        setExercises(prev => [ex, ...prev]);
        setNewQuestion("");
        setNewAnswer("");
        setNewTopic("");
        setAdding(false);
      } else {
        toast.error("添加失败，请重试");
      }
    } catch {
      toast.error("网络错误，请检查网络后重试");
    }
  }

  async function handleDeleteExercise(exerciseId: string) {
    if (!confirm("确定删除这道习题吗？")) return;
    try {
      const res = await fetch(`/api/textbooks/${id}/exercises`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId }),
      });
      if (res.ok) {
        setExercises(prev => prev.filter(e => e.id !== exerciseId));
      } else {
        toast.error("删除失败，请重试");
      }
    } catch {
      toast.error("网络错误，请检查网络后重试");
    }
  }

  async function handleBatchParse() {
    if (!batchQuestionsContent.trim()) return;
    setBatchParsing(true);
    setBatchResult(null);
    try {
      const res = await fetch(`/api/textbooks/${id}/exercises/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionsContent: batchQuestionsContent,
          questionsDocName: batchQuestionsDocName.trim() || undefined,
          answersContents: batchAnswers.length > 0 ? batchAnswers : undefined,
          provider: localStorage.getItem("socratopia_active_provider") || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBatchResult(`成功导入 ${data.inserted} 道习题${data.dual ? "（已对照答案文档匹配）" : ""}`);
        if (data.exercises) setExercises(prev => [...data.exercises, ...prev]);
        setBatchQuestionsContent("");
        setBatchQuestionsDocName("");
        setBatchAnswers([]);
      } else {
        setBatchResult(`解析失败：${data.error}`);
        if (data.raw) setBatchResult(prev => prev + `\n(${data.raw})`);
      }
    } catch {
      setBatchResult("网络错误，请重试");
    } finally {
      setBatchParsing(false);
    }
  }

  function handleQuestionsFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchQuestionsDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setBatchQuestionsContent(reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleAnswersFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBatchAnswers(prev => [...prev, { name: file.name, content: reader.result as string }]);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  }

  if (loading) return <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}><Spinner size={28} /></div>;
  if (error) return <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}><ErrorDisplay message={error} onRetry={loadTextbook} /></div>;
  if (!textbook) return null;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.back()} style={{
          padding: "0.4rem 0.75rem",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}>
          ← 返回
        </button>
        <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", margin: 0, flex: 1 }}>
          {textbook.title}
        </h1>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0", marginBottom: "1.25rem", borderBottom: "2px solid var(--border)" }}>
        <button onClick={() => setTab("content")} style={{
          padding: "0.5rem 1.25rem",
          background: "transparent",
          border: "none",
          borderBottom: tab === "content" ? "2px solid var(--accent)" : "2px solid transparent",
          color: tab === "content" ? "var(--accent)" : "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: tab === "content" ? 600 : 400,
          marginBottom: "-2px",
        }}>
          📖 内容
        </button>
        <button onClick={() => setTab("exercises")} style={{
          padding: "0.5rem 1.25rem",
          background: "transparent",
          border: "none",
          borderBottom: tab === "exercises" ? "2px solid var(--accent)" : "2px solid transparent",
          color: tab === "exercises" ? "var(--accent)" : "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: tab === "exercises" ? 600 : 400,
          marginBottom: "-2px",
        }}>
          ✏️ 习题库 ({exercises.length})
        </button>
      </div>

      {tab === "content" && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "2rem",
          lineHeight: 1.8,
          fontSize: "0.95rem",
        }}>
          <div className="markdown-content">
            <ReactMarkdown>{textbook.parsedContent}</ReactMarkdown>
          </div>
        </div>
      )}

      {tab === "exercises" && (
        <div>
          {/* Add exercise form */}
          {adding ? (
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1.25rem",
              marginBottom: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}>
              <input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="知识点标签（可选，如：第一章·正义的定义）"
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                }}
              />
              <textarea
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="题目"
                rows={3}
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
              <textarea
                value={newAnswer}
                onChange={e => setNewAnswer(e.target.value)}
                placeholder="参考答案（可选）"
                rows={3}
                style={{
                  padding: "0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  fontFamily: "monospace",
                }}
              />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => setAdding(false)} style={{
                  padding: "0.4rem 1rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}>
                  取消
                </button>
                <button onClick={handleAddExercise} disabled={!newQuestion.trim()} style={{
                  padding: "0.4rem 1rem",
                  background: newQuestion.trim() ? "var(--accent)" : "var(--border)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: newQuestion.trim() ? "pointer" : "not-allowed",
                  fontSize: "0.85rem",
                }}>
                  添加
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{
              padding: "0.6rem 1rem",
              background: "var(--bg-card)",
              border: "1px dashed var(--border)",
              borderRadius: "8px",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              width: "100%",
              marginBottom: "1rem",
            }}>
              + 添加习题
            </button>
          )}

          {/* Batch import */}
          {batchOpen ? (
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--accent)",
              borderRadius: "10px",
              padding: "1.25rem",
              marginBottom: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent)" }}>
                批量导入（AI 智能解析）
              </div>

              {/* Questions document */}
              <div style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text)" }}>
                  习题文档 {batchQuestionsContent ? <span style={{ color: "var(--accent)", fontWeight: 400 }}>（已输入）</span> : <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>（必填）</span>}
                </div>
                <label style={{
                  padding: "0.4rem 0.65rem",
                  background: "var(--bg-card)",
                  border: "1px dashed var(--border)",
                  borderRadius: "6px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  textAlign: "center",
                  display: "block",
                }}>
                  {batchQuestionsDocName || "上传文件（.txt / .md）"}
                  <input type="file" accept=".txt,.md" onChange={handleQuestionsFileUpload} style={{ display: "none" }} />
                </label>
                <textarea
                  value={batchQuestionsContent}
                  onChange={e => setBatchQuestionsContent(e.target.value)}
                  placeholder="或者直接粘贴习题内容..."
                  rows={5}
                  style={{
                    padding: "0.6rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.8rem",
                    resize: "vertical",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {/* Answers documents */}
              <div style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text)" }}>
                  答案文档（可选，可上传多份）{batchAnswers.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 400 }}>（已选 {batchAnswers.length} 份）</span>}
                </div>
                <label style={{
                  padding: "0.4rem 0.65rem",
                  background: "var(--bg-card)",
                  border: "1px dashed var(--border)",
                  borderRadius: "6px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  textAlign: "center",
                  display: "block",
                }}>
                  + 上传文件（.txt / .md，可多选）
                  <input type="file" accept=".txt,.md" multiple onChange={handleAnswersFileUpload} style={{ display: "none" }} />
                </label>
                {batchAnswers.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {batchAnswers.map((a, i) => (
                      <div key={i} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.3rem 0.5rem",
                        background: "var(--bg-card)",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        color: "var(--text)",
                      }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{a.name}</span>
                        <button onClick={() => setBatchAnswers(prev => prev.filter((_, j) => j !== i))} style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          padding: "0 0.2rem",
                        }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {batchResult && (
                <div style={{
                  padding: "0.5rem 0.75rem",
                  background: batchResult.startsWith("成功") ? "var(--accent-light)" : "var(--bg)",
                  border: `1px solid ${batchResult.startsWith("成功") ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  color: batchResult.startsWith("成功") ? "var(--accent)" : "var(--text-muted)",
                  whiteSpace: "pre-wrap",
                }}>
                  {batchResult}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => {
                  setBatchOpen(false); setBatchResult(null);
                  setBatchQuestionsContent(""); setBatchQuestionsDocName("");
                  setBatchAnswers([]);
                }} style={{
                  padding: "0.4rem 1rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}>
                  取消
                </button>
                <button onClick={handleBatchParse} disabled={!batchQuestionsContent.trim() || batchParsing} style={{
                  padding: "0.4rem 1rem",
                  background: batchQuestionsContent.trim() && !batchParsing ? "var(--accent)" : "var(--border)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: batchQuestionsContent.trim() && !batchParsing ? "pointer" : "not-allowed",
                  fontSize: "0.85rem",
                }}>
                  {batchParsing ? "解析中…" : "智能解析"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setBatchOpen(true)} style={{
              padding: "0.5rem 0.75rem",
              background: "var(--bg-card)",
              border: "1px dashed var(--border)",
              borderRadius: "8px",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "0.8rem",
              width: "100%",
              marginBottom: "1rem",
            }}>
              批量导入（AI 智能解析）
            </button>
          )}

          {/* Exercise list */}
          {exLoading ? (
            <div style={{ color: "var(--text-muted)", padding: "1rem 0" }}>加载中…</div>
          ) : exercises.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>
              还没有习题，点击上方按钮添加
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {exercises.map((ex, i) => (
                <div key={ex.id} style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.85rem 1rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          #{i + 1}
                        </span>
                        {ex.topic && (
                          <span style={{
                            fontSize: "0.65rem",
                            padding: "0.1rem 0.45rem",
                            background: "var(--accent-light)",
                            color: "var(--accent)",
                            borderRadius: "10px",
                          }}>
                            {ex.topic}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6 }}>
                        {ex.question}
                      </div>
                      {expandedAnswer === ex.id && ex.answer && (
                        <div style={{
                          marginTop: "0.6rem",
                          padding: "0.6rem 0.75rem",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          color: "var(--text)",
                          lineHeight: 1.6,
                        }}>
                          <div style={{ fontWeight: 600, fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                            参考答案
                          </div>
                          {ex.answer}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                      {ex.answer && (
                        <button onClick={() => setExpandedAnswer(expandedAnswer === ex.id ? null : ex.id)} style={{
                          padding: "0.2rem 0.45rem",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          whiteSpace: "nowrap",
                        }}>
                          {expandedAnswer === ex.id ? "收起" : "答案"}
                        </button>
                      )}
                      <button onClick={() => handleDeleteExercise(ex.id)} style={{
                        padding: "0.2rem 0.45rem",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.65rem",
                      }}>
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
