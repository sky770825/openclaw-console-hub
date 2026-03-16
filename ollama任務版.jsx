import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════
//  Ollama 任務板 — 專屬 Ollama 控制台
//  模型管理 · ollama_bot2 · Gateway · 知識庫
// ═══════════════════════════════════════════════════════

const C = {
  bg: "#06060a", s1: "#0c0c12", s2: "#13131b", s3: "#1a1a24",
  border: "rgba(255,255,255,0.05)", borderH: "rgba(255,255,255,0.1)",
  t1: "#eeeef2", t2: "#9d9daa", t3: "#5c5c6a",
  indigo: "#818cf8", indigoD: "#6366f1", indigoG: "rgba(99,102,241,0.1)",
  green: "#34d399", greenG: "rgba(52,211,153,0.08)",
  amber: "#fbbf24", amberG: "rgba(251,191,36,0.08)",
  red: "#f87171", redG: "rgba(248,113,113,0.08)",
  cyan: "#22d3ee", cyanG: "rgba(34,211,238,0.08)",
  purple: "#c084fc", purpleG: "rgba(192,132,252,0.08)",
};

const Pulse = ({ c = C.green, s = 6 }) => (
  <span style={{ position: "relative", display: "inline-block", width: s, height: s, marginRight: 5, flexShrink: 0 }}>
    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, animation: "oc-p 2s ease-in-out infinite" }} />
    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c }} />
  </span>
);

const Badge = ({ children, c, bg, mono, style = {} }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: mono ? 6 : 99, fontSize: 10, fontWeight: 650, color: c, background: bg, letterSpacing: mono ? 0.5 : 0.2, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", whiteSpace: "nowrap", ...style }}>{children}</span>
);

const Card = ({ children, style = {}, glow }) => (
  <div style={{ background: C.s2, border: glow ? `1px solid ${glow}25` : `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", transition: "all .2s", ...style }}>{children}</div>
);

const Sec = ({ icon, title, count, right, children }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.t1 }}>{title}</h2>
        {count !== undefined && <span style={{ background: "rgba(255,255,255,0.05)", color: C.t3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99 }}>{count}</span>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

// ─── Ollama 狀態 Panel ─────────────────────────

function OllamaStatusPanel({ ollamaStatus }) {
  const ok = ollamaStatus?.ok ?? false;
  const models = ollamaStatus?.models ?? [];
  return (
    <Sec icon="🦙" title="Ollama 狀態" count={ok ? `${models.length} 模型` : "離線"} right={ok ? <Pulse c={C.green} s={5} /> : <Badge c={C.red} bg={C.redG}>離線</Badge>}>
      <Card>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
          {ok ? (
            <>
              <div style={{ marginBottom: 8 }}>本機 Ollama 運行中</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {models.map((m, i) => <Badge key={i} c={C.indigo} bg={C.indigoG}>{m}</Badge>)}
              </div>
            </>
          ) : (
            <div>無法連線到 <span style={{ fontFamily: "monospace", color: C.cyan }}>http://127.0.0.1:11434</span><br />請確認 Ollama app 已開啟或執行 <span style={{ fontFamily: "monospace" }}>ollama serve</span></div>
          )}
        </div>
      </Card>
    </Sec>
  );
}

// ─── ollama_bot2 控制 Panel ────────────────────

const BOT_COMMANDS = [
  { cmd: "📊 狀態", desc: "檢查 Ollama 與已載入模型" },
  { cmd: "📋 切換模型", desc: "選擇 qwen3:8b、llama3.2 等" },
  { cmd: "🔄 重啟 OpenClaw", desc: "完整重啟 OpenClaw Gateway" },
  { cmd: "openclaw gateway restart", desc: "文字觸發 Gateway 重啟" },
  { cmd: "🔄 重啟 Ollama", desc: "重啟 Ollama serve" },
  { cmd: "📋 Gateway 日誌", desc: "gateway.err.log 最後 30 行" },
  { cmd: "🔍 檢查 Port", desc: "檢查 port 18789 佔用" },
  { cmd: "📋 服務列表", desc: "openclaw、ollama 相關 launchctl" },
  { cmd: "🗑 清除記憶", desc: "清除該用戶長期記憶與對話歷程" },
];

const SLASH_CMDS = [
  "/start", "/status", "/model [名稱]", "/clear_memory",
  "/restart_openclaw", "/restart_ollama", "/gateway_logs", "/check_port", "/list_services", "/bot_logs",
];

function OllamaBotPanel() {
  return (
    <Sec icon="🤖" title="ollama_bot2 控制" right={<Badge c={C.cyan} bg={C.cyanG}>Telegram Bot</Badge>}>
      <div style={{ fontSize: 11, color: C.t2, marginBottom: 12 }}>透過 Telegram 對 ollama_bot2 發送以下按鈕或文字指令（需 ALLOWED_USER_IDS 權限）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {BOT_COMMANDS.map((b, i) => (
          <Card key={i} glow={b.cmd.includes("重啟") ? C.amber : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.t1, fontWeight: 600 }}>{b.cmd}</span>
              <span style={{ fontSize: 11, color: C.t2, flex: 1, textAlign: "right" }}>{b.desc}</span>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: 12, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 650, color: C.purple, marginBottom: 6 }}>斜線指令</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: C.t2 }}>{SLASH_CMDS.join(" · ")}</div>
      </div>
    </Sec>
  );
}

// ─── 模型管理 Panel ───────────────────────────

const MODELS = [
  { id: "qwen3:8b", name: "Qwen 3 8B", desc: "新一代、中文佳", rec: true },
  { id: "llama3.2:latest", name: "Llama 3.2", desc: "Meta 通用模型" },
  { id: "qwen2.5:7b", name: "Qwen 2.5 7B", desc: "較快、中文好" },
  { id: "qwen2.5:14b", name: "Qwen 2.5 14B", desc: "品質更好但較慢" },
  { id: "mistral:latest", name: "Mistral", desc: "輕量、回覆快" },
  { id: "deepseek-r1:8b", name: "DeepSeek R1", desc: "推理強、較吃資源" },
];

function ModelPanel() {
  return (
    <Sec icon="📦" title="模型管理" count={MODELS.length}>
      <div style={{ fontSize: 11, color: C.t2, marginBottom: 10 }}>常用 Ollama 模型，用 bot「📋 切換模型」或 <span style={{ fontFamily: "monospace" }}>/model &lt;名稱&gt;</span> 切換</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {MODELS.map((m) => (
          <Card key={m.id} glow={m.rec ? C.green : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{m.name}</span>
              {m.rec && <Badge c={C.green} bg={C.greenG}>推薦</Badge>}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: C.cyan, marginBottom: 4 }}>{m.id}</div>
            <div style={{ fontSize: 11, color: C.t2 }}>{m.desc}</div>
          </Card>
        ))}
      </div>
    </Sec>
  );
}

// ─── 知識庫 Panel ─────────────────────────────

const KNOWLEDGE_ITEMS = [
  { name: "knowledge_base.md", desc: "手動維護核心知識（任務板、OpenClaw、Ollama）" },
  { name: "knowledge_auto.md", desc: "RAG 定時更新，從 docs/ 整合摘要" },
  { name: "記憶 (memory)", desc: "每用戶長期記憶，可 consolidating 濃縮" },
];

function KnowledgePanel() {
  return (
    <Sec icon="📚" title="知識庫" count="RAG">
      <div style={{ fontSize: 11, color: C.t2, marginBottom: 10 }}>ollama_bot2 每次對話會注入知識庫，強化回答準確度</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {KNOWLEDGE_ITEMS.map((k, i) => (
          <Card key={i}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.t1, fontFamily: "monospace" }}>{k.name}</span>
            <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>{k.desc}</div>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 10, padding: 10, background: C.indigoG, border: `1px solid rgba(99,102,241,0.1)`, borderRadius: 8, fontSize: 11, color: C.t2 }}>
        定時更新：LaunchAgent <span style={{ fontFamily: "monospace", color: C.cyan }}>ai.ollama.rag-update</span> 每 24h 執行 consolidate_knowledge.py
      </div>
    </Sec>
  );
}

// ─── 路徑與重啟 Panel ────────────────────────

const PATHS = [
  { label: "專案", path: "/Users/caijunchang/openclaw任務面版設計" },
  { label: "ollama_bot2", path: "ollama_bot2.py" },
  { label: "知識庫", path: "knowledge/knowledge_base.md" },
  { label: "Ollama API", path: "http://127.0.0.1:11434" },
  { label: "Gateway 日誌", path: "~/.openclaw/logs/gateway.err.log" },
];

function PathsPanel() {
  return (
    <Sec icon="📁" title="路徑與資源">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PATHS.map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "6px 0", borderBottom: i < PATHS.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: 11, color: C.t3 }}>{p.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.cyan, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{p.path}</span>
          </div>
        ))}
      </div>
    </Sec>
  );
}

// ─── Reset Gateway 按鈕 ─────────────────

function ResetGatewayBtn() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const _env = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim?.();
  const _dev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
  const API_BASE = _env ? _env.replace(/\/$/, "") : (_dev ? "http://localhost:3009" : "");
  const apiUrl = (path) => API_BASE ? `${API_BASE}${path.startsWith("/") ? path : "/" + path}` : path.startsWith("/") ? path : "/" + path;

  const restart = async () => {
    setLoading(true);
    setOk(false);
    try {
      const r = await fetch(apiUrl("/api/openclaw/restart-gateway"), { method: "POST", headers: { "Content-Type": "application/json" } });
      const j = await r.json();
      setOk(j.ok === true);
      if (!j.ok) toast.error("重啟失敗");
      if (j.ok) setTimeout(() => setOk(false), 2500);
    } catch (e) {
      toast.error("無法連線 API");
    }
    setLoading(false);
  };

  return (
    <button type="button" onClick={restart} disabled={loading} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s2, color: C.t1, fontSize: 11, fontWeight: 600, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }} title="重啟 OpenClaw Gateway">
      {loading ? "重啟中…" : ok ? "✓ 已重啟" : "↻ 重啟 Gateway"}
    </button>
  );
}

// ─── API 設定 ───────────────────────────

const _env = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim?.();
const _dev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
const API_BASE = _env ? _env.replace(/\/$/, "") : (_dev ? "http://localhost:3009" : "");

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path.startsWith("/") ? path : "/" + path}` : path.startsWith("/") ? path : "/" + path;
}

async function fetchOllamaStatus() {
  try {
    const r = await fetch(apiUrl("/api/ollama/status"), { method: "GET", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { ok: false };
    const d = await r.json();
    return d;
  } catch {
    return { ok: false };
  }
}

// ─── Main App ────────────────────────────

export default function OllamaTaskBoard() {
  const [tab, setTab] = useState("status");
  const [ollamaStatus, setOllamaStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchOllamaStatus().then((s) => {
      if (mounted) setOllamaStatus(s);
    });
    const t = setInterval(() => {
      fetchOllamaStatus().then((s) => {
        if (mounted) setOllamaStatus(s);
      });
    }, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const tabs = [
    { k: "status", l: "🦙 Ollama 狀態" },
    { k: "bot", l: "🤖 Bot 控制" },
    { k: "models", l: "📦 模型" },
    { k: "knowledge", l: "📚 知識庫" },
    { k: "paths", l: "📁 路徑" },
  ];

  const renderTab = () => {
    if (tab === "status") return <OllamaStatusPanel ollamaStatus={ollamaStatus} />;
    if (tab === "bot") return <OllamaBotPanel />;
    if (tab === "models") return <ModelPanel />;
    if (tab === "knowledge") return <KnowledgePanel />;
    return <PathsPanel />;
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box", background: C.bg, color: C.t1, fontFamily: "'Geist','SF Pro Display',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes oc-p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(2)}}
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(6,6,10,0.9)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.indigoD},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🦙</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2 }}>Ollama<span style={{ fontWeight: 400, color: C.t3, marginLeft: 7, fontSize: 12 }}>任務板</span></h1>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>ollama_bot2 · 模型 · 知識庫 · Gateway</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Pulse c={ollamaStatus?.ok ? C.green : C.red} s={5} />
            <span style={{ fontSize: 11, color: ollamaStatus?.ok ? C.green : C.red, fontWeight: 500 }}>{ollamaStatus?.ok ? "Ollama 在線" : "Ollama 離線"}</span>
          </div>
          <ResetGatewayBtn />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "8px 24px", display: "flex", gap: 2, borderBottom: `1px solid rgba(255,255,255,0.02)`, background: "rgba(6,6,10,0.5)", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button type="button" key={t.k} onClick={() => setTab(t.k)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: tab === t.k ? "rgba(255,255,255,0.06)" : "transparent", color: tab === t.k ? C.t1 : C.t3, fontSize: 12, fontWeight: tab === t.k ? 600 : 500, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap", fontFamily: "inherit" }}>{t.l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px", maxWidth: 800, width: "100%", margin: "0 auto" }}>{renderTab()}</div>
    </div>
  );
}
