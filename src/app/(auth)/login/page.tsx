"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.user) router.push("/chat");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/chat");
      } else {
        const data = await res.json();
        setError(data.error || "操作失败");
      }
    } catch {
      setError("网络错误，请检查网络连接后重试");
      toast.error("网络连接失败");
    } finally {
      setLoading(false);
    }
  }

  const sloganStyle: React.CSSProperties = {
    maxWidth: "440px",
    padding: "2.8rem 2rem",
    borderRadius: "24px",
    fontSize: "1.6rem",
    fontWeight: 700,
    lineHeight: 1.8,
    textAlign: "center",
    color: "#fff",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    opacity: 0,
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      gap: "1.5rem",
      padding: "2rem 1rem",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        flexWrap: "wrap",
      }}>
        {/* Left slogan */}
        <div style={{
          ...sloganStyle,
          background: "linear-gradient(135deg, #e74c3c, #c0392b)",
          transform: "rotate(-3deg)",
          animation: "fadeIn 3.6s ease-out 0.6s forwards",
        }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>😩</span>还在为想睡过早八<br />却怕落下课程<br />而烦恼吗
        </div>

      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "3rem 2rem",
        maxWidth: "400px",
        width: "100%",
      }}>
        <h1 style={{
          textAlign: "center",
          fontFamily: "var(--font-heading)",
          fontSize: "1.5rem",
          color: "var(--accent)",
          marginBottom: "0.5rem",
        }}>
          先贤之灵
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>
          {mode === "login" ? "欢迎回来，继续与先贤对话" : "在图书馆里唤醒沉睡千年的智慧"}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            邮箱
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "1rem",
              marginBottom: "1rem",
            }}
          />

          <label style={{ display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === "register" ? "至少 4 位" : "输入密码"}
            required
            minLength={4}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "1rem",
              marginBottom: mode === "register" ? "0.75rem" : "1rem",
            }}
          />

          {mode === "register" && (
            <>
              <label style={{ display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="再输一遍"
                required
                minLength={4}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "1rem",
                  marginBottom: "1rem",
                }}
              />
            </>
          )}

          {error && (
            <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginBottom: "1rem",
            }}
          >
            {loading
              ? (mode === "login" ? "正在登录…" : "正在注册…")
              : (mode === "login" ? "进入图书馆" : "注册新账号")
            }
          </button>
        </form>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {mode === "login" ? (
            <>还没有账号？<button
              onClick={() => { setMode("register"); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: 0,
              }}
            >注册</button></>
          ) : (
            <>已有账号？<button
              onClick={() => { setMode("login"); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: 0,
              }}
            >登录</button></>
          )}
        </p>
      </div>

        {/* Right slogan */}
        <div style={{
          ...sloganStyle,
          background: "linear-gradient(135deg, #e67e22, #d35400)",
          transform: "rotate(3deg)",
          animation: "fadeIn 3.6s ease-out 1.8s forwards",
        }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>😤</span>还在为你校<br />令人堪忧的教学质量<br />感到难绷吗
        </div>
      </div>

      {/* Bottom call-to-action */}
      <div style={{
        background: "linear-gradient(135deg, var(--accent), #6c5ce7)",
        color: "#fff",
        padding: "1rem 2.5rem",
        borderRadius: "50px",
        fontSize: "1.3rem",
        fontWeight: 800,
        letterSpacing: "0.05em",
        boxShadow: "0 6px 30px rgba(108, 92, 231, 0.35)",
        opacity: 0,
        animation: "fadeInUp 3.6s ease-out 3.0s forwards, bounce 2s ease-in-out 7s infinite",
        textAlign: "center",
      }}>
        🚀 快来试试"Socratopia 学习空间"吧
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
