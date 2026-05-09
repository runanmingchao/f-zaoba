"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ErrorDisplay } from "@/components/ui/error-display";
import { toast } from "sonner";

const PRESET_PROVIDERS = [
  { id: "anthropic", name: "Anthropic (Claude)", model: "claude-sonnet-4-20250514", hasOwnModel: true },
  { id: "openai", name: "OpenAI (GPT)", model: "gpt-4o", baseUrl: "" },
  { id: "gemini", name: "Google (Gemini)", model: "gemini-2.5-flash", hasOwnModel: true },
  { id: "deepseek", name: "DeepSeek", model: "deepseek-v4-pro", baseUrl: "https://api.deepseek.com/v1" },
  { id: "qwen", name: "通义千问", model: "qwen-plus", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { id: "moonshot", name: "Moonshot (月之暗面)", model: "moonshot-v1-8k", baseUrl: "https://api.moonshot.cn/v1" },
  { id: "zhipu", name: "智谱 GLM", model: "glm-4", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "minimax", name: "MiniMax", model: "MiniMax-M2.7", baseUrl: "https://api.minimaxi.com/v1" },
];

interface SavedKey {
  provider: string;
  hasKey: boolean;
}

type StyleTheme = "default" | "cyberpunk" | "cool" | "minimal" | "anime" | "nature";
type ColorTheme = "light" | "dark";
type FontSize = "small" | "medium" | "large" | "xlarge";

const STYLE_OPTIONS: { value: StyleTheme; label: string; desc: string }[] = [
  { value: "default", label: "🏛️ 经典", desc: "金色学院风" },
  { value: "cyberpunk", label: "🌃 科幻", desc: "赛博霓虹风" },
  { value: "cool", label: "🔥 酷炫", desc: "潮流炫酷风" },
  { value: "minimal", label: "⬜ 简约", desc: "极简主义" },
  { value: "anime", label: "🌸 二次元", desc: "可爱萌系风" },
  { value: "nature", label: "🌿 自然", desc: "绿意盎然风" },
];

const FONT_OPTIONS = [
  { value: "", label: "默认字体" },
  { value: "Noto Serif SC, serif", label: "思源宋体" },
  { value: "Noto Sans SC, sans-serif", label: "思源黑体" },
  { value: "KaiTi, serif", label: "楷体" },
  { value: "SimSun, serif", label: "宋体" },
  { value: "Microsoft YaHei, sans-serif", label: "微软雅黑" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Comic Neue, cursive", label: "Comic Neue" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
  { value: "xlarge", label: "特大" },
];

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [models, setModels] = useState<Record<string, string>>(
    Object.fromEntries(PRESET_PROVIDERS.map(p => [p.id, p.model]))
  );
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>(
    Object.fromEntries(PRESET_PROVIDERS.map(p => [p.id, p.baseUrl || ""]))
  );
  const [activeProvider, setActiveProvider] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("socratopia_active_provider");
    return null;
  });

  // Theme preferences
  const [colorTheme, setColorTheme] = useState<ColorTheme>("light");
  const [styleOverride, setStyleOverride] = useState<StyleTheme | null>(null);
  const [themeMode, setThemeMode] = useState<"world" | "override">("world");

  // Font preferences
  const [fontFamily, setFontFamily] = useState("");
  const [fontSize, setFontSize] = useState<FontSize>("medium");

  useEffect(() => {
    // Load theme preferences
    fetch("/api/preferences")
      .then(r => r.json())
      .then(pref => {
        if (pref.preferredTheme === "dark" || pref.preferredTheme === "light") {
          setColorTheme(pref.preferredTheme);
        }
        if (pref.styleOverride) {
          setStyleOverride(pref.styleOverride as StyleTheme);
          setThemeMode("override");
        }
        // Load font preferences
        if (pref.fontFamily) setFontFamily(pref.fontFamily);
        if (pref.fontSize) setFontSize(pref.fontSize as FontSize);
      })
      .catch(() => {});
  }, []);

  function handleColorThemeChange(theme: ColorTheme) {
    setColorTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("socratopia_color_theme", theme);
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredTheme: theme }),
    }).catch(() => {});
  }

  function handleStyleOverrideChange(style: StyleTheme | null) {
    setStyleOverride(style);
    setThemeMode(style ? "override" : "world");
    document.documentElement.setAttribute("data-style", style || "default");
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleOverride: style }),
    }).catch(() => {});
  }

  function handleFontFamilyChange(font: string) {
    setFontFamily(font);
    const newFont = font || "Noto Serif SC, serif";
    document.documentElement.style.setProperty("--font-body", newFont);
    document.documentElement.style.setProperty("--font-heading", newFont);
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fontFamily: font }),
    }).catch(() => {});
  }

  function handleFontSizeChange(size: FontSize) {
    setFontSize(size);
    document.documentElement.setAttribute("data-font-size", size);
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fontSize: size }),
    }).catch(() => {});
  }

  const [customProvider, setCustomProvider] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");

  function loadKeys() {
    setKeysError(null);
    setKeysLoading(true);
    fetch("/api/profile/keys")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSavedKeys(data);
          if (!activeProvider && data.length > 0) {
            const first = data[0].provider;
            setActiveProvider(first);
            localStorage.setItem("socratopia_active_provider", first);
          }
        }
      })
      .catch(() => setKeysError("加载失败，请重试"))
      .finally(() => setKeysLoading(false));
  }

  useEffect(() => { loadKeys(); }, []);

  function setActive(provider: string) {
    setActiveProvider(provider);
    localStorage.setItem("socratopia_active_provider", provider);
  }

  async function saveKey(provider: string, key: string) {
    if (!key?.trim()) return;
    try {
      const body: Record<string, string> = { provider, apiKey: key.trim() };
      if (models[provider]) body.model = models[provider];
      if (baseUrls[provider]) body.baseUrl = baseUrls[provider];

      const res = await fetch("/api/profile/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(prev => ({ ...prev, [provider]: true }));
        setSavedKeys(prev => {
          const filtered = prev.filter(k => k.provider !== provider);
          return [...filtered, { provider, hasKey: true }];
        });
        setMessage(`${provider} Key 已保存`);
        setTimeout(() => { setSaved(prev => ({ ...prev, [provider]: false })); setMessage(""); }, 2000);
      }
    } catch {
      toast.error("保存失败，请重试");
    }
  }

  async function saveCustomKey() {
    if (!customProvider.trim() || !customKey.trim()) return;
    const body: Record<string, string> = { provider: customProvider.trim(), apiKey: customKey.trim() };
    if (customBaseUrl.trim()) body.baseUrl = customBaseUrl.trim();
    if (customModel.trim()) body.model = customModel.trim();

    try {
      const res = await fetch("/api/profile/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSavedKeys(prev => {
          const filtered = prev.filter(k => k.provider !== customProvider.trim());
          return [...filtered, { provider: customProvider.trim(), hasKey: true }];
        });
        setMessage(`${customProvider.trim()} Key 已保存`);
        setCustomProvider("");
        setCustomKey("");
        setCustomBaseUrl("");
        setCustomModel("");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch {
      toast.error("保存失败，请重试");
    }
  }

  const hasKeyFor = (provider: string) => savedKeys.some(k => k.provider === provider && k.hasKey);
  const customProviders = savedKeys.filter(k => !PRESET_PROVIDERS.find(p => p.id === k.provider));

  return (
    <div style={{ padding: "2rem", maxWidth: "640px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", fontSize: "1.3rem", marginBottom: "2rem" }}>
        ⚙️ 设置
      </h1>

      {/* Theme Preferences Section */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1rem", color: "var(--text)", marginBottom: "1rem" }}>
          外观与主题
        </h2>

        {/* Color Theme Toggle */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "1rem",
          marginBottom: "1rem",
        }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            配色方案
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => handleColorThemeChange("light")}
              style={{
                flex: 1,
                padding: "0.6rem 1rem",
                background: colorTheme === "light" ? "var(--accent)" : "var(--bg)",
                color: colorTheme === "light" ? "#fff" : "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: colorTheme === "light" ? 600 : 400,
              }}
            >
              ☀️ 浅色
            </button>
            <button
              onClick={() => handleColorThemeChange("dark")}
              style={{
                flex: 1,
                padding: "0.6rem 1rem",
                background: colorTheme === "dark" ? "var(--accent)" : "var(--bg)",
                color: colorTheme === "dark" ? "#fff" : "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: colorTheme === "dark" ? 600 : 400,
              }}
            >
              🌙 深色
            </button>
          </div>
        </div>

        {/* Style Override Toggle */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "1rem",
        }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            <span>UI 风格</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>
              {themeMode === "override" ? "手动覆盖" : "跟随世界"}
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {STYLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStyleOverrideChange(styleOverride === opt.value ? null : opt.value)}
                style={{
                  padding: "0.6rem 0.5rem",
                  background: (styleOverride || themeMode === "world") && styleOverride !== opt.value ? "var(--bg)" :
                             (styleOverride === opt.value || (styleOverride === null && themeMode === "world" && opt.value === "default"))
                             ? "var(--accent)" : "var(--bg)",
                  color: (styleOverride === opt.value || (styleOverride === null && themeMode === "world" && opt.value === "default"))
                         ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                {opt.label.split(" ")[0]} {opt.label.split(" ")[1]}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => handleStyleOverrideChange(null)}
              style={{
                flex: 1,
                padding: "0.4rem 0.75rem",
                background: themeMode === "world" ? "var(--accent-light)" : "transparent",
                color: themeMode === "world" ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${themeMode === "world" ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              🌍 跟随世界主题
            </button>
            <button
              onClick={() => handleStyleOverrideChange(styleOverride || "default")}
              style={{
                flex: 1,
                padding: "0.4rem 0.75rem",
                background: themeMode === "override" ? "var(--accent-light)" : "transparent",
                color: themeMode === "override" ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${themeMode === "override" ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              ✨ 手动选择风格
            </button>
          </div>
        </div>

        {/* Font Preferences */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "1rem",
          marginTop: "1rem",
        }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            字体与大小
          </label>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              字体
            </label>
            <select
              value={fontFamily}
              onChange={e => handleFontFamilyChange(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {FONT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              字大小
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {FONT_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleFontSizeChange(opt.value)}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.5rem",
                    background: fontSize === opt.value ? "var(--accent)" : "var(--bg)",
                    color: fontSize === opt.value ? "#fff" : "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "var(--text)", marginBottom: "1rem" }}>
          API Key 配置
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          你的 API Key 会加密存储。支持所有 OpenAI 兼容协议的模型（deepseek, qwen, moonshot, zhipu, grok…），也可在下方添加自定义提供商。
        </p>

        {keysLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Spinner /></div>
        ) : keysError ? (
          <ErrorDisplay message={keysError} onRetry={loadKeys} />
        ) : (
          <>
            {PRESET_PROVIDERS.map(provider => (
          <div key={provider.id} style={{
            background: "var(--bg-card)",
            border: `1px solid ${hasKeyFor(provider.id) ? "#27ae60" : "var(--border)"}`,
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "0.75rem",
          }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              <span>
                {provider.name}
                {hasKeyFor(provider.id) && (
                  <span style={{ color: "#27ae60", marginLeft: "0.5rem", fontSize: "0.8rem" }}>● 已配置</span>
                )}
                {activeProvider === provider.id && hasKeyFor(provider.id) && (
                  <span style={{ color: "var(--accent)", marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: 700 }}>当前使用</span>
                )}
              </span>
              {hasKeyFor(provider.id) && activeProvider !== provider.id && (
                <button onClick={() => setActive(provider.id)} style={{
                  padding: "0.2rem 0.5rem",
                  background: "transparent",
                  border: "1px solid var(--accent)",
                  borderRadius: "4px",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  whiteSpace: "nowrap",
                }}>
                  设为当前
                </button>
              )}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="password"
                  value={apiKeys[provider.id] || ""}
                  onChange={e => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                  placeholder={hasKeyFor(provider.id) ? "已保存，输入新 Key 以更新" : "API Key"}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                />
                <button onClick={() => saveKey(provider.id, apiKeys[provider.id])} style={{
                  padding: "0.5rem 1rem",
                  background: saved[provider.id] ? "#27ae60" : "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}>
                  {saved[provider.id] ? "✓ 已保存" : "保存"}
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={models[provider.id] || ""}
                  onChange={e => setModels(prev => ({ ...prev, [provider.id]: e.target.value }))}
                  placeholder="模型名"
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="text"
                  value={baseUrls[provider.id] || ""}
                  onChange={e => setBaseUrls(prev => ({ ...prev, [provider.id]: e.target.value }))}
                  placeholder="Base URL（可选，OpenAI 兼容协议）"
                  style={{
                    flex: 2,
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Custom providers that have been saved */}
        {customProviders.map(cp => (
          <div key={cp.provider} style={{
            background: "var(--bg-card)",
            border: "1px solid #27ae60",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "0.75rem",
          }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              <span>
                {cp.provider} <span style={{ color: "#27ae60", fontSize: "0.8rem" }}>● 已配置</span>
                {activeProvider === cp.provider && (
                  <span style={{ color: "var(--accent)", marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: 700 }}>当前使用</span>
                )}
              </span>
              {activeProvider !== cp.provider && (
                <button onClick={() => setActive(cp.provider)} style={{
                  padding: "0.2rem 0.5rem",
                  background: "transparent",
                  border: "1px solid var(--accent)",
                  borderRadius: "4px",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  whiteSpace: "nowrap",
                }}>
                  设为当前
                </button>
              )}
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="password"
                value={apiKeys[cp.provider] || ""}
                onChange={e => setApiKeys(prev => ({ ...prev, [cp.provider]: e.target.value }))}
                placeholder="输入新 Key 以更新"
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                }}
              />
              <button onClick={() => saveKey(cp.provider, apiKeys[cp.provider])} style={{
                padding: "0.5rem 1rem",
                background: saved[cp.provider] ? "#27ae60" : "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
              }}>
                {saved[cp.provider] ? "✓ 已保存" : "更新"}
              </button>
            </div>
          </div>
        ))}

        {/* Custom provider form */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px dashed var(--border)",
          borderRadius: "10px",
          padding: "1rem",
          marginTop: "0.5rem",
        }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            + 添加自定义提供商
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={customProvider}
                onChange={e => setCustomProvider(e.target.value)}
                placeholder="提供商名称 (如 grok, together...)"
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                }}
              />
              <input
                type="text"
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="模型名 (可选)"
                style={{
                  width: "160px",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="password"
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                placeholder="API Key"
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                }}
              />
              <input
                type="text"
                value={customBaseUrl}
                onChange={e => setCustomBaseUrl(e.target.value)}
                placeholder="Base URL (可选，OpenAI 兼容协议)"
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <button onClick={saveCustomKey} disabled={!customProvider.trim() || !customKey.trim()} style={{
              padding: "0.5rem 1rem",
              background: (customProvider.trim() && customKey.trim()) ? "var(--accent)" : "var(--border)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: (customProvider.trim() && customKey.trim()) ? "pointer" : "not-allowed",
              fontSize: "0.85rem",
              alignSelf: "flex-end",
            }}>
              保存自定义 Key
            </button>
          </div>
        </div>

          </>
        )}
        {message && (
          <p style={{
            padding: "0.5rem 1rem",
            background: "var(--accent-light)",
            color: "var(--accent)",
            borderRadius: "6px",
            fontSize: "0.85rem",
            marginTop: "1rem",
          }}>
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
