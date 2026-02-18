import { useState, useCallback } from "react";
import { C, Card, Btn, Badge, Sec } from "../uiPrimitives";
import { apiUrl, apiHeaders } from "@/services/openclawBoardApi";

// ── 指令註冊表 ──
const COMMANDS = [
  {
    cat: "system", label: "系統控制", icon: "🔧",
    cmds: [
      { id: "auto-start", name: "啟動自動執行器", desc: "開始自動處理佇列中的任務", icon: "▶️", method: "POST", path: "/api/openclaw/auto-executor/start", confirm: true },
      { id: "auto-stop", name: "停止自動執行器", desc: "暫停任務自動執行", icon: "⏸", method: "POST", path: "/api/openclaw/auto-executor/stop", confirm: true },
      { id: "dispatch-toggle", name: "切換派工模式", desc: "開啟或關閉自動派工", icon: "🟣", method: "POST", path: "/api/openclaw/dispatch/toggle", confirm: true },
      { id: "deputy-toggle", name: "暫代模式", desc: "開啟/關閉 Claude Code 自動暫代執行", icon: "🤖", method: "POST", path: "/api/openclaw/deputy/toggle", confirm: true },
      { id: "deputy-status", name: "暫代狀態", desc: "查看暫代模式狀態與上次執行結果", icon: "📋", method: "GET", path: "/api/openclaw/deputy/status" },
      { id: "emergency-stop", name: "緊急停止", desc: "立即停止所有執行中任務", icon: "🛑", method: "POST", path: "/api/emergency/stop-all", confirm: true, danger: true },
    ],
  },
  {
    cat: "reports", label: "報告", icon: "📊",
    cmds: [
      { id: "daily-report", name: "日報", desc: "生成並發送每日報告到 Telegram", icon: "📋", method: "GET", path: "/api/openclaw/daily-report?notify=1" },
      { id: "wake-reports", name: "甦醒報告", desc: "查看未解決的甦醒報告", icon: "🔔", method: "GET", path: "/api/openclaw/wake-report" },
      { id: "health-check", name: "健康檢查", desc: "完整系統健康檢查", icon: "🏥", method: "GET", path: "/api/health" },
      { id: "board-health", name: "看板健康", desc: "任務看板健康摘要", icon: "📈", method: "GET", path: "/api/openclaw/board-health" },
    ],
  },
  {
    cat: "maintenance", label: "維護", icon: "🔩",
    cmds: [
      { id: "reconcile", name: "修復孤立任務", desc: "修正卡住或孤立的任務狀態", icon: "🔧", method: "POST", path: "/api/openclaw/maintenance/reconcile", confirm: true },
      { id: "rebuild-index", name: "重建索引", desc: "重建 Markdown 文件索引", icon: "📂", method: "POST", path: "/api/openclaw/indexer/rebuild-md", confirm: true },
      { id: "restart-gateway", name: "重啟 Gateway", desc: "重新啟動 API Gateway", icon: "🔄", method: "POST", path: "/api/openclaw/restart-gateway", confirm: true },
    ],
  },
  {
    cat: "notifications", label: "通知", icon: "📬",
    cmds: [
      { id: "test-telegram", name: "測試 Telegram", desc: "發送 Telegram 測試通知", icon: "📤", method: "POST", path: "/api/telegram/test" },
      { id: "indexer-status", name: "索引器狀態", desc: "查看索引器運行狀態", icon: "🔍", method: "GET", path: "/api/openclaw/indexer/status" },
    ],
  },
];

function timeSince(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function CommandCard({ cmd, state, onExec }) {
  const st = state || { status: "idle" };
  const [showResult, setShowResult] = useState(false);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{cmd.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 650, color: C.t1, flex: 1 }}>{cmd.name}</span>
        {st.status === "loading" && <Badge c={C.amber} bg={C.amberG}>執行中...</Badge>}
        {st.status === "success" && <Badge c={C.green} bg={C.greenG}>成功 {timeSince(st.ts)}</Badge>}
        {st.status === "error" && <Badge c={C.red} bg={C.redG}>失敗</Badge>}
      </div>
      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.4 }}>{cmd.desc}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        <Btn
          v={cmd.danger ? "no" : "pri"}
          sm
          dis={st.status === "loading"}
          onClick={() => onExec(cmd)}
        >
          {st.status === "loading" ? "..." : "執行"}
        </Btn>
        {st.result && (
          <Btn v="gh" sm onClick={() => setShowResult(!showResult)}>
            {showResult ? "收起" : "結果"}
          </Btn>
        )}
      </div>
      {showResult && st.result && (
        <pre style={{
          margin: 0, padding: 8, borderRadius: 6,
          background: "rgba(0,0,0,0.3)", color: C.t2,
          fontSize: 10, lineHeight: 1.4, overflow: "auto",
          maxHeight: 200, whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          {st.result}
        </pre>
      )}
    </Card>
  );
}

export function renderCmdTab() {
  return <CmdTabInner />;
}

function CmdTabInner() {
  const [states, setStates] = useState({});

  const exec = useCallback(async (cmd) => {
    if (cmd.confirm && !window.confirm(`確定要執行「${cmd.name}」？`)) return;

    setStates((p) => ({ ...p, [cmd.id]: { status: "loading" } }));
    try {
      const url = apiUrl(cmd.path);
      const opts = { method: cmd.method };
      if (cmd.method !== "GET") {
        opts.headers = apiHeaders(true);
      }
      const res = await fetch(url, opts);
      const data = await res.json().catch(() => ({}));
      const resultText = JSON.stringify(data, null, 2).slice(0, 2000);
      setStates((p) => ({
        ...p,
        [cmd.id]: { status: res.ok ? "success" : "error", result: resultText, ts: Date.now() },
      }));
    } catch (e) {
      setStates((p) => ({
        ...p,
        [cmd.id]: { status: "error", result: String(e), ts: Date.now() },
      }));
    }
  }, []);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ fontSize: 12, color: C.t3, marginBottom: 16, lineHeight: 1.5 }}>
        系統管理指令中心。點擊「執行」呼叫對應 API，危險操作會要求確認。
      </div>
      {COMMANDS.map((group) => (
        <Sec key={group.cat} icon={group.icon} title={group.label} count={group.cmds.length}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 10,
          }}>
            {group.cmds.map((cmd) => (
              <CommandCard key={cmd.id} cmd={cmd} state={states[cmd.id]} onExec={exec} />
            ))}
          </div>
        </Sec>
      ))}
    </div>
  );
}
