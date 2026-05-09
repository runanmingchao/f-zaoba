"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { SkeletonPage } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface Companion {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPreset: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (!data.user) router.push("/login");
      else setUser(data.user);
    }).catch(() => {
      // Auth check failed — redirect to login as fallback
      router.push("/login");
    }).finally(() => setLoading(false));
    fetch("/api/companions").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCompanions(data);
    }).catch(() => {});
    const t = localStorage.getItem("socratopia-theme") as "light" | "dark" || "light";
    setTheme(t);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("socratopia-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{
          width: 260, flexShrink: 0,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          padding: "1.5rem 1rem",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          <div style={{ marginBottom: "1rem", padding: "0 0.5rem" }}>
            <div style={{ width: "60%", height: 22, background: "var(--border)", borderRadius: 4, animation: "shimmer 1.8s ease-in-out infinite" }} />
            <div style={{ width: "40%", height: 12, background: "var(--border)", borderRadius: 4, marginTop: 6, animation: "shimmer 1.8s ease-in-out infinite" }} />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 34, background: "var(--border)", borderRadius: 6, opacity: 0.5, animation: "shimmer 1.8s ease-in-out infinite" }} />
          ))}
        </div>
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spinner size={28} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: "260px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: "1rem", padding: "0 0.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.1rem", margin: 0 }}>
            先贤之灵
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: "0.25rem 0 0" }}>{user.email}</p>
        </div>

        <NavItem href="/chat" active={pathname === "/chat"} label="💬 课堂" />
        <NavItem href="/companions" active={pathname.startsWith("/companions")} label="🧑‍🏫 先贤" />
        <NavItem href="/world" active={pathname === "/world"} label="🌍 世界" />
        <NavItem href="/conversations" active={pathname === "/conversations"} label="💬 对话" />
        <NavItem href="/library" active={pathname.startsWith("/library")} label="📚 教材" />

        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginBottom: "0.25rem", padding: "0 0.5rem" }}>
            学习工具
          </p>
          <NavItem href="/tools/diary" active={pathname === "/tools/diary"} label="📓 日记" />
          <NavItem href="/tools/groupchat" active={pathname === "/tools/groupchat"} label="👥 群聊" />
        </div>

        <NavItem href="/settings" active={pathname === "/settings"} label="⚙️ 设置" />

        {/* Companion list in sidebar */}
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.5rem", padding: "0 0.5rem" }}>
            三位先贤
          </p>
          {companions.filter(c => c.isPreset).map(c => (
            <div key={c.id} style={{
              padding: "0.4rem 0.5rem",
              borderRadius: "6px",
              color: "var(--text)",
              fontSize: "0.85rem",
            }}>
              {c.name}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
          <button onClick={toggleTheme} style={{
            flex: 1,
            padding: "0.5rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button onClick={logout} style={{
            flex: 1,
            padding: "0.5rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}>
            离开
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", maxHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} style={{
      padding: "0.5rem 0.75rem",
      borderRadius: "6px",
      background: active ? "var(--accent-light)" : "transparent",
      color: active ? "var(--accent)" : "var(--text)",
      textDecoration: "none",
      fontSize: "0.9rem",
      fontWeight: active ? 600 : 400,
    }}>
      {label}
    </Link>
  );
}
