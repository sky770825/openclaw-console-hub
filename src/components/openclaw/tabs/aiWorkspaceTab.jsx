import { useState, useMemo } from "react";
import { C, Btn, Card, Sec, Badge, RiskBadge, RiskStamp, RISK_COLORS } from "../uiPrimitives";
import { searchMemory, getMemoryStats, addMemory, recordInsight, recordDailyReport, exportMemory } from "@/services/aiMemoryStore";

const LS_COLLAPSED = "openclaw_ai_ws_collapsed";
const LS_REPORTS = "openclaw_ai_reports";

function readLS(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function writeLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

function Collapse({ id, icon, title, count, badge, open, map, toggle, children }) {
  const closed = map[id] ?? !open;
  return <div style={{ marginBottom: 10 }}>
    <div onClick={() => toggle(id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer" }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 650, color: C.t1, flex: 1 }}>{title}</span>
      {count !== undefined && <span style={{ fontSize: 9, color: C.t3, background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 99 }}>{count}</span>}
      {badge}
      <span style={{ fontSize: 9, color: C.t3, transition: "transform .15s", transform: closed ? "rotate(-90deg)" : "rotate(0)" }}>▼</span>
    </div>
    {!closed && <div style={{ paddingTop: 6, animation: "oc-su .12s ease" }}>{children}</div>}
  </div>;
}

function generateDailyReport({ reviews, tasks, evo, inbox, sentToBoss, aiApproved, bossApproved, activeTasks, queuedTasks, doneTasks }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  const timeStr = now.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });

  const totalReviews = reviews.length;
  const pending = reviews.filter(r => r.status === "pending").length;
  const approved = reviews.filter(r => r.status === "approved").length;
  const rejected = reviews.filter(r => r.status === "rejected").length;
  const stamped = reviews.filter(r => r._aiStamped).length;

  const riskBreakdown = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };
  reviews.forEach(r => { const lv = r._riskLevel || "none"; if (riskBreakdown[lv] !== undefined) riskBreakdown[lv]++; });

  const lines = [
    `📋 AI 工作區日報 — ${dateStr} ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📨 進件狀態`,
    `  待處理：${inbox.length}｜送老蔡審核中：${sentToBoss.length}`,
    `  AI 已通過：${aiApproved.length}｜老蔡已核准：${bossApproved.length}`,
    ``,
    `📊 審核總覽（共 ${totalReviews} 筆）`,
    `  待審：${pending}｜已通過：${approved}｜已駁回：${rejected}`,
    `  AI 蓋章數：${stamped}`,
    ``,
    `🛡️ 風險分佈`,
    `  安全：${riskBreakdown.none}｜低：${riskBreakdown.low}｜中：${riskBreakdown.medium}｜高：${riskBreakdown.high}｜極高：${riskBreakdown.critical}`,
    ``,
    `📋 任務狀態`,
    `  排隊中：${queuedTasks.length}｜執行中：${activeTasks.length}｜已完成：${doneTasks.length}`,
    ``,
    `📝 近期操作（最近 5 筆）`,
  ];
  evo.slice(0, 5).forEach(e => lines.push(`  ${e.t} ${e.x}`));
  if (evo.length === 0) lines.push(`  （暫無紀錄）`);
  lines.push(``, `━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🤖 由 AI 工作區自動產生`);

  return { dateStr, timeStr, text: lines.join("\n"), ts: now.toISOString() };
}

function DailyReportSection({ reportData, onGenerate, colMap, toggle }) {
  const [reports] = useState(() => readLS(LS_REPORTS, []));
  const [showHistory, setShowHistory] = useState(false);
  const [lastReport, setLastReport] = useState(null);

  const handleGenerate = () => {
    const rpt = onGenerate();
    setLastReport(rpt);
    const saved = readLS(LS_REPORTS, []);
    saved.unshift({ ts: rpt.ts, dateStr: rpt.dateStr, timeStr: rpt.timeStr, text: rpt.text });
    if (saved.length > 30) saved.length = 30;
    writeLS(LS_REPORTS, saved);
    // 自動寫入記憶
    recordDailyReport(rpt.text);
  };

  const allReports = lastReport ? [lastReport, ...reports.filter(r => r.ts !== lastReport.ts)] : reports;

  return <Collapse id="report" icon="📊" title="日報 / 閉環同步" count={allReports.length}
    badge={<Badge c={C.cyan} bg={C.cyanG}>Update</Badge>}
    open={true} map={colMap} toggle={toggle}>

    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      <Btn sm v="pri" onClick={handleGenerate} style={{ flex: 1, justifyContent: "center" }}>
        📊 產生日報
      </Btn>
      {allReports.length > 0 && <Btn sm v="def" onClick={() => setShowHistory(!showHistory)} style={{ fontSize: 9 }}>
        {showHistory ? "收起歷史" : `歷史 (${allReports.length})`}
      </Btn>}
    </div>

    {/* 最新日報 */}
    {lastReport && <div style={{
      padding: "10px 12px", background: C.s2, border: `1px solid ${C.cyan}20`,
      borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${C.cyan}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10 }}>📋</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan }}>最新日報 — {lastReport.dateStr} {lastReport.timeStr}</span>
      </div>
      <pre style={{
        fontSize: 9, color: C.t2, lineHeight: 1.5, margin: 0,
        whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "inherit",
      }}>{lastReport.text}</pre>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <Btn sm v="def" onClick={() => { navigator.clipboard.writeText(lastReport.text); }} style={{ fontSize: 8 }}>
          📋 複製
        </Btn>
      </div>
    </div>}

    {/* 歷史日報 */}
    {showHistory && allReports.length > 0 && <div style={{ maxHeight: 200, overflowY: "auto" }}>
      {allReports.slice(lastReport ? 1 : 0, 10).map((rpt, i) => <div key={rpt.ts || i} style={{
        padding: "6px 10px", background: C.s1, border: `1px solid ${C.border}`,
        borderRadius: 6, marginBottom: 3, cursor: "pointer",
      }} onClick={() => setLastReport(rpt)}>
        <div style={{ fontSize: 9, fontWeight: 600, color: C.t2 }}>📊 {rpt.dateStr} {rpt.timeStr}</div>
        <div style={{ fontSize: 8, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {rpt.text.split("\n").slice(3, 5).join(" | ")}
        </div>
      </div>)}
    </div>}

    {!lastReport && allReports.length === 0 && <div style={{ textAlign: "center", padding: 10, color: C.t3, fontSize: 10 }}>
      點擊「產生日報」彙整今日工作狀態
    </div>}
  </Collapse>;
}

// ── 記憶類型 icon/color 映射 ──
const MEM_TYPE_CFG = {
  decision: { icon: "⚖️", label: "決策", c: C.indigo },
  task_result: { icon: "✅", label: "任務結果", c: C.green },
  report: { icon: "📊", label: "日報", c: C.cyan },
  insight: { icon: "💡", label: "洞察", c: C.amber },
  external: { icon: "📡", label: "外部資訊", c: C.purple },
  note: { icon: "📝", label: "筆記", c: C.t2 },
};

function MemoryCenter({ colMap, toggle }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [results, setResults] = useState(null);
  const [stats, setStats] = useState(() => getMemoryStats());
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState("");

  const doSearch = () => {
    const opts = {};
    if (filterType) opts.type = filterType;
    const res = searchMemory(query, { ...opts, limit: 30 });
    setResults(res);
  };

  const refreshStats = () => setStats(getMemoryStats());

  const handleAddNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    const tags = noteTags.split(/[,，\s]+/).filter(Boolean);
    recordInsight({ title: noteTitle || "筆記", content: noteContent, tags });
    setNoteTitle(""); setNoteContent(""); setNoteTags(""); setShowAddNote(false);
    refreshStats();
  };

  const handleExport = () => {
    const data = exportMemory();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ai-memory-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return <Collapse id="memory" icon="🧠" title="AI 記憶中心" count={stats.total}
    badge={<Badge c={C.purple} bg={C.purpleG}>Memory</Badge>}
    open={false} map={colMap} toggle={toggle}>

    {/* 統計概覽 */}
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
      {Object.entries(stats.byType || {}).map(([type, count]) => {
        const cfg = MEM_TYPE_CFG[type] || { icon: "📌", label: type, c: C.t3 };
        return <span key={type} style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 8px", borderRadius: 6,
          background: `${cfg.c}10`, border: `1px solid ${cfg.c}20`,
          fontSize: 9, fontWeight: 600, color: cfg.c, cursor: "pointer",
        }} onClick={() => { setFilterType(type === filterType ? "" : type); setResults(null); }}>
          {cfg.icon} {cfg.label} <span style={{ fontWeight: 800 }}>{count}</span>
        </span>;
      })}
      {stats.total === 0 && <span style={{ fontSize: 10, color: C.t3 }}>尚無記憶紀錄</span>}
    </div>

    {/* 熱門標籤 */}
    {stats.topTags && stats.topTags.length > 0 && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
      <span style={{ fontSize: 8, color: C.t3 }}>熱門：</span>
      {stats.topTags.slice(0, 8).map(({ tag, count }) => <span key={tag} style={{
        padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.border}`, fontSize: 8, color: C.t3, cursor: "pointer",
      }} onClick={() => { setQuery(tag); setTimeout(doSearch, 0); }}>
        #{tag} ({count})
      </span>)}
    </div>}

    {/* 搜尋列 */}
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === "Enter" && doSearch()}
        placeholder="搜尋記憶..."
        style={{
          flex: 1, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
          background: C.s1, color: C.t1, fontSize: 10, fontFamily: "inherit", outline: "none",
        }}
      />
      <Btn sm v="pri" onClick={doSearch} style={{ fontSize: 9 }}>搜尋</Btn>
    </div>

    {/* 篩選 + 工具列 */}
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      {filterType && <span style={{
        display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px",
        borderRadius: 5, background: C.indigoG, border: `1px solid ${C.indigo}30`,
        fontSize: 9, color: C.indigo,
      }}>
        篩選：{MEM_TYPE_CFG[filterType]?.label || filterType}
        <span style={{ cursor: "pointer", marginLeft: 2 }} onClick={() => { setFilterType(""); setResults(null); }}>✕</span>
      </span>}
      <span style={{ flex: 1 }} />
      <Btn sm v="def" onClick={() => setShowAddNote(!showAddNote)} style={{ fontSize: 8 }}>
        {showAddNote ? "取消" : "💡 新增筆記"}
      </Btn>
      <Btn sm v="def" onClick={handleExport} style={{ fontSize: 8 }}>
        📥 匯出
      </Btn>
    </div>

    {/* 新增筆記表單 */}
    {showAddNote && <div style={{
      padding: "8px 10px", background: C.s2, border: `1px solid ${C.amber}20`,
      borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${C.amber}`,
    }}>
      <input
        value={noteTitle}
        onChange={e => setNoteTitle(e.target.value)}
        placeholder="標題"
        style={{ width: "100%", padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.t1, fontSize: 10, fontFamily: "inherit", outline: "none", marginBottom: 4 }}
      />
      <textarea
        value={noteContent}
        onChange={e => setNoteContent(e.target.value)}
        placeholder="內容 / 洞察 / 筆記..."
        rows={3}
        style={{ width: "100%", padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.t1, fontSize: 10, fontFamily: "inherit", outline: "none", resize: "vertical", marginBottom: 4 }}
      />
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          value={noteTags}
          onChange={e => setNoteTags(e.target.value)}
          placeholder="標籤（逗號分隔）"
          style={{ flex: 1, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.t1, fontSize: 9, fontFamily: "inherit", outline: "none" }}
        />
        <Btn sm v="pri" onClick={handleAddNote} style={{ fontSize: 9 }}>儲存</Btn>
      </div>
    </div>}

    {/* 搜尋結果 */}
    {results !== null && <div style={{ maxHeight: 300, overflowY: "auto" }}>
      {results.length === 0 && <div style={{ textAlign: "center", padding: 12, color: C.t3, fontSize: 10 }}>沒有找到相關記憶</div>}
      {results.map(mem => {
        const cfg = MEM_TYPE_CFG[mem.type] || { icon: "📌", label: mem.type, c: C.t3 };
        return <div key={mem.id} style={{
          padding: "6px 10px", marginBottom: 3, background: C.s1,
          border: `1px solid ${C.border}`, borderRadius: 7,
          borderLeft: `3px solid ${cfg.c}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 10 }}>{cfg.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 650, color: C.t1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title}</span>
            <span style={{ fontSize: 7, color: C.t3 }}>{new Date(mem.ts).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}</span>
            {mem.importance >= 7 && <span style={{ fontSize: 7, color: C.amber }}>★{mem.importance}</span>}
          </div>
          <div style={{ fontSize: 9, color: C.t2, lineHeight: 1.4 }}>{(mem.content || "").slice(0, 120)}{(mem.content || "").length > 120 ? "…" : ""}</div>
          {mem.tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
            {mem.tags.slice(0, 5).map(t => <span key={t} style={{ padding: "0 5px", borderRadius: 3, background: "rgba(255,255,255,0.03)", fontSize: 7, color: C.t3 }}>#{t}</span>)}
          </div>}
        </div>;
      })}
    </div>}
  </Collapse>;
}

export function renderAiWorkspaceTab(data, actions) {
  return <AiWorkspace data={data} actions={actions} />;
}

function AiWorkspace({ data, actions }) {
  const { reviews = [], tasks = [], evo = [] } = data || {};
  const { autoReviewByRisk, setDrawer, okR, noR, okRAndCreateTask } = actions || {};

  const [colMap, setColMap] = useState(() => readLS(LS_COLLAPSED, {}));
  const toggle = (id) => setColMap(p => { const n = { ...p, [id]: !p[id] }; writeLS(LS_COLLAPSED, n); return n; });

  // ── 分類 review 狀態 ──
  // 進件：小蔡送來的待處理（status=pending, 還沒被 AI 蓋章）
  const inbox = reviews.filter(r => r.status === "pending" && !r._aiStamped && !r._pendingBoss);
  // AI 已蓋章，正在等老蔡（高風險）
  const sentToBoss = reviews.filter(r => r._pendingBoss && r.status === "pending");
  // AI 蓋章直接通過的
  const aiApproved = reviews.filter(r => r._aiStamped && r.status === "approved" && !r._bossApproved);
  // 老蔡核准回來的
  const bossApproved = reviews.filter(r => r._bossApproved && r.status === "approved");
  // 執行中的任務
  const activeTasks = tasks.filter(t => t.status === "in_progress");
  const queuedTasks = tasks.filter(t => t.status === "queued");
  const doneTasks = tasks.filter(t => t.status === "done");
  // 最近的進化紀錄（AI 操作日誌）
  const recentEvo = evo.slice(0, 15);

  // 統計
  const totalProcessed = aiApproved.length + bossApproved.length + sentToBoss.length;

  return <div>
    {/* 標題 */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 16px", background: "linear-gradient(135deg, rgba(129,140,248,0.06), rgba(34,211,238,0.06))", borderRadius: 12, border: `1px solid ${C.indigo}20` }}>
      <span style={{ fontSize: 24 }}>🤖</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>AI 工作區</div>
        <div style={{ fontSize: 10, color: C.t3 }}>小蔡進件 → AI 過篩 → 執行 or 送老蔡</div>
      </div>
      {inbox.length > 0 && <Badge c={C.cyan} bg={C.cyanG}>{inbox.length} 進件</Badge>}
      {sentToBoss.length > 0 && <Badge c={C.purple} bg={C.purpleG}>{sentToBoss.length} 送審中</Badge>}
      <Badge c={C.green} bg={C.greenG}>{activeTasks.length} 執行中</Badge>
    </div>

    {/* ── 流水線概覽 ── */}
    <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: "8px 12px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: "auto" }}>
      {[
        { l: "📨 進件", v: inbox.length, c: C.cyan },
        { l: "→", v: "", c: C.t3 },
        { l: "🔖 AI 過篩", v: totalProcessed, c: C.indigo },
        { l: "→", v: "", c: C.t3 },
        { l: "✅ 直接過", v: aiApproved.length, c: C.green },
        { l: "🔴 送老蔡", v: sentToBoss.length, c: C.red },
        { l: "→", v: "", c: C.t3 },
        { l: "📋 任務", v: queuedTasks.length + activeTasks.length, c: C.amber },
        { l: "🏆 完成", v: doneTasks.length, c: C.green },
      ].map((s, i) => s.l === "→"
        ? <span key={i} style={{ fontSize: 14, color: C.t3, alignSelf: "center", padding: "0 2px" }}>→</span>
        : <div key={i} style={{ textAlign: "center", padding: "4px 10px", minWidth: 50 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: C.t3, whiteSpace: "nowrap" }}>{s.l}</div>
          </div>
      )}
    </div>

    {/* ── 雙欄 ── */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      {/* 左欄：進件 + 過篩 */}
      <div>
        {/* 進件區 */}
        <Collapse id="inbox" icon="📨" title="小蔡進件" count={inbox.length}
          badge={inbox.length > 0 ? <Badge c={C.cyan} bg={C.cyanG}>待處理</Badge> : null}
          open={true} map={colMap} toggle={toggle}>
          {inbox.length === 0 && <div style={{ textAlign: "center", padding: 16, color: C.t3, fontSize: 10 }}>目前沒有新進件</div>}

          {/* 批量過篩 */}
          {inbox.length > 0 && autoReviewByRisk && <div style={{ marginBottom: 8 }}>
            <Btn sm v="pri" onClick={async () => {
              if (!confirm(`AI 將自動過篩 ${inbox.length} 個進件：\n・低/中風險 → 直接過 + 轉任務\n・高風險 → 送老蔡\n\n確定？`)) return;
              for (const r of inbox) await autoReviewByRisk(r.id);
            }} style={{ width: "100%", justifyContent: "center" }}>
              🔖 全部過篩 ({inbox.length})
            </Btn>
          </div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {inbox.map(r => {
              const risk = r._riskLevel || "none";
              const riskCfg = RISK_COLORS[risk] || RISK_COLORS.none;
              return <Card key={r.id} style={{ padding: "8px 10px" }} glow={risk !== "none" ? riskCfg.c : undefined}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {risk !== "none" && <RiskStamp level={risk} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.t1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                  {risk !== "none" && <RiskBadge level={risk} />}
                </div>
                <div style={{ fontSize: 10, color: C.t2, lineHeight: 1.4, marginBottom: 4 }}>{(r.desc || "").slice(0, 80)}{(r.desc || "").length > 80 ? "…" : ""}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.t3, marginBottom: 4 }}>
                  <span>{r.src || "未知來源"}</span> · <span>{r.date}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {setDrawer && <Btn sm v="def" onClick={() => setDrawer(r)} style={{ fontSize: 9, padding: "2px 8px" }}>🔍</Btn>}
                  {autoReviewByRisk && <Btn sm v="pri" onClick={() => autoReviewByRisk(r.id)} style={{ fontSize: 9, padding: "2px 8px" }}>🔖 過篩</Btn>}
                  <span style={{ flex: 1 }} />
                  {okR && <Btn sm v="ok" onClick={() => okR(r.id)} style={{ fontSize: 9, padding: "2px 8px" }}>✓ 直接過</Btn>}
                  {okRAndCreateTask && <Btn sm v="pri" onClick={() => okRAndCreateTask(r)} style={{ fontSize: 9, padding: "2px 8px" }}>📋 過+轉任務</Btn>}
                </div>
              </Card>;
            })}
          </div>
        </Collapse>

        {/* 送老蔡中 */}
        {sentToBoss.length > 0 && <Collapse id="sent-boss" icon="🔴" title="已送老蔡審核" count={sentToBoss.length}
          badge={<Badge c={C.purple} bg={C.purpleG}>等待中</Badge>}
          open={true} map={colMap} toggle={toggle}>
          {sentToBoss.map(r => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: C.purpleG, border: `1px solid ${C.purple}15`, borderRadius: 7, marginBottom: 3 }}>
            <RiskStamp level={r._riskLevel} />
            <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
            <Badge c={C.purple} bg={C.purpleG} style={{ fontSize: 8 }}>等老蔡</Badge>
            {r._aiStampedAt && <span style={{ fontSize: 8, color: C.t3 }}>
              {new Date(r._aiStampedAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>}
          </div>)}
        </Collapse>}

        {/* AI 直接通過的 */}
        {aiApproved.length > 0 && <Collapse id="ai-passed" icon="✅" title="AI 已通過" count={aiApproved.length}
          open={false} map={colMap} toggle={toggle}>
          {aiApproved.map(r => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: C.greenG, border: `1px solid ${C.green}15`, borderRadius: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 10 }}>✅</span>
            <span style={{ flex: 1, fontSize: 10, color: C.green, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
            <span style={{ fontSize: 8, color: C.t3 }}>{r._aiStampRisk || "safe"}</span>
          </div>)}
        </Collapse>}

        {/* 老蔡核准回來的 */}
        {bossApproved.length > 0 && <Collapse id="boss-back" icon="👤" title="老蔡已核准" count={bossApproved.length}
          open={false} map={colMap} toggle={toggle}>
          {bossApproved.map(r => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: C.greenG, border: `1px solid ${C.green}15`, borderRadius: 7, marginBottom: 2 }}>
            <RiskStamp level={r._riskLevel} />
            <span style={{ flex: 1, fontSize: 10, color: C.green, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
            <Badge c={C.green} bg={C.greenG} style={{ fontSize: 8 }}>老蔡核准</Badge>
          </div>)}
        </Collapse>}
      </div>

      {/* 右欄：任務 + 操作日誌 */}
      <div>
        {/* 執行中 */}
        <Collapse id="active" icon="🔄" title="執行中任務" count={activeTasks.length}
          badge={activeTasks.length > 0 ? <Badge c={C.indigo} bg={C.indigoG}>運行中</Badge> : null}
          open={true} map={colMap} toggle={toggle}>
          {activeTasks.length === 0 && <div style={{ textAlign: "center", padding: 12, color: C.t3, fontSize: 10 }}>目前沒有執行中的任務</div>}
          {activeTasks.map(t => <Card key={t.id} style={{ padding: "8px 10px", marginBottom: 4 }} glow={C.indigo}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10 }}>🔄</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.t1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title || t.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.indigo }}>{t.progress || 0}%</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${t.progress || 0}%`, background: C.indigo, borderRadius: 2, transition: "width .3s" }} />
            </div>
            {t.thought && <div style={{ fontSize: 9, color: C.t3, marginTop: 3 }}>💭 {t.thought}</div>}
          </Card>)}
        </Collapse>

        {/* 排隊中 */}
        <Collapse id="queued" icon="📋" title="排隊中" count={queuedTasks.length}
          open={true} map={colMap} toggle={toggle}>
          {queuedTasks.length === 0 && <div style={{ textAlign: "center", padding: 12, color: C.t3, fontSize: 10 }}>沒有排隊中的任務</div>}
          {queuedTasks.map(t => <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 10 }}>📋</span>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title || t.name}</span>
            {t.fromR && <Badge c={C.indigo} bg={C.indigoG} style={{ fontSize: 7 }}>來自審核</Badge>}
          </div>)}
        </Collapse>

        {/* 已完成 */}
        {doneTasks.length > 0 && <Collapse id="done" icon="🏆" title="已完成" count={doneTasks.length}
          open={false} map={colMap} toggle={toggle}>
          {doneTasks.slice(0, 10).map(t => <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", marginBottom: 2 }}>
            <span style={{ fontSize: 9 }}>✅</span>
            <span style={{ flex: 1, fontSize: 9, color: C.t3 }}>{t.title || t.name}</span>
          </div>)}
          {doneTasks.length > 10 && <div style={{ fontSize: 9, color: C.t3, textAlign: "center" }}>⋯ 共 {doneTasks.length} 個</div>}
        </Collapse>}

        {/* 日報 / 閉環同步 */}
        <DailyReportSection
          reportData={{ reviews, tasks, evo, inbox, sentToBoss, aiApproved, bossApproved, activeTasks, queuedTasks, doneTasks }}
          onGenerate={() => generateDailyReport({ reviews, tasks, evo, inbox, sentToBoss, aiApproved, bossApproved, activeTasks, queuedTasks, doneTasks })}
          colMap={colMap}
          toggle={toggle}
        />

        {/* 操作日誌 */}
        <Collapse id="log" icon="📝" title="操作日誌" count={recentEvo.length}
          open={false} map={colMap} toggle={toggle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recentEvo.map((e, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0" }}>
              <span style={{ fontSize: 8, color: C.t3, whiteSpace: "nowrap", marginTop: 2 }}>{e.t}</span>
              <span style={{ fontSize: 10, color: e.c || C.t2, flex: 1, lineHeight: 1.3 }}>{e.x}</span>
            </div>)}
            {recentEvo.length === 0 && <div style={{ fontSize: 10, color: C.t3, textAlign: "center", padding: 8 }}>暫無紀錄</div>}
          </div>
        </Collapse>
      </div>
    </div>

    {/* ── 記憶中心（全寬） ── */}
    <div style={{ marginTop: 16 }}>
      <MemoryCenter colMap={colMap} toggle={toggle} />
    </div>
  </div>;
}
