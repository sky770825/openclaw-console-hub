import { useState } from "react";
import { C, Btn, Card, Sec, Badge, RiskBadge, RiskStamp } from "../uiPrimitives";

const LS_KEY = "openclaw_boss_decisions";
const LS_NOTES_KEY = "openclaw_boss_notes";
const LS_COLLAPSED_KEY = "openclaw_boss_collapsed";

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── 預設待決定事項（含分類） ──
const DEFAULT_ITEMS = [
  { id: "boss-1", title: "紫燈系統部署", desc: "dispatch 系統代碼已 commit，是否要部署到生產環境？", category: "部署", zone: "ops", status: "pending", createdAt: "2026-02-17" },
  { id: "boss-2", title: "潘朵拉 n8n 分線合併", desc: "6 條分線可合併為 1 個 workflow + switch 路由，減少維護量。", category: "架構", zone: "ops", status: "pending", createdAt: "2026-02-17" },
  { id: "boss-3", title: "餐車 E1+E2 做 SaaS", desc: "模組化研究完成（訂單引擎、菜單系統、授權中心等）。是否開始做 SaaS 平台？", category: "商業", zone: "ops", status: "pending", createdAt: "2026-02-17" },
  { id: "boss-4", title: "新 repo 命名確認", desc: "C2→junyang666-v2、D6→yangmeilife-v2、G1→niceshow-v2", category: "規範", zone: "ops", status: "pending", createdAt: "2026-02-17" },
  { id: "boss-5", title: "LINE OA 統一模板", desc: "所有專案的 LINE 串接用同一套 n8n 模板，還是各做各的？", category: "架構", zone: "ops", status: "pending", createdAt: "2026-02-17" },
  { id: "boss-6", title: "hannai 多租戶推廣", desc: "hannai 的多租戶架構是否推廣到 B6 haowei？", category: "架構", zone: "ops", status: "pending", createdAt: "2026-02-17" },
];

const STATUS_CFG = {
  pending:  { label: "待決定", color: C.amber, bg: C.amberG, icon: "⏳" },
  approved: { label: "已核准", color: C.green, bg: C.greenG, icon: "✅" },
  rejected: { label: "不做",   color: C.red,   bg: C.redG,   icon: "❌" },
  deferred: { label: "暫緩",   color: C.t3,    bg: "rgba(255,255,255,0.03)", icon: "⏸️" },
};

const CAT_COLOR = {
  "部署": C.green, "架構": C.indigo, "商業": C.amber, "規範": C.purple, "其他": C.t3,
};

const CAT_ICON = {
  "部署": "🚀", "架構": "🏗️", "商業": "💼", "規範": "📏", "其他": "📌",
};

// ── 收合區塊 ──
function CollapsibleSec({ id, icon, title, count, badge, defaultOpen = true, collapsedMap, onToggle, children }) {
  const collapsed = collapsedMap[id] ?? !defaultOpen;
  return <div style={{ marginBottom: 12 }}>
    <div onClick={() => onToggle(id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", transition: "all .15s" }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 650, color: C.t1, flex: 1 }}>{title}</span>
      {count !== undefined && <span style={{ fontSize: 9, color: C.t3, background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 99 }}>{count}</span>}
      {badge}
      <span style={{ fontSize: 9, color: C.t3, transition: "transform .15s", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}>▼</span>
    </div>
    {!collapsed && <div style={{ paddingTop: 6, animation: "oc-su .12s ease" }}>{children}</div>}
  </div>;
}

export function renderBossTab(data, actions) {
  return <BossZone data={data} actions={actions} />;
}

function BossZone({ data, actions }) {
  const { reviews = [] } = data || {};
  const { bossApproveReview, bossRejectReview, setDrawer } = actions || {};

  // ── 高風險待老蔡審核 ──
  const highRiskPending = reviews.filter(r =>
    r._pendingBoss && r.status === "pending" &&
    (r._riskLevel === "high" || r._riskLevel === "critical")
  );
  const bossHandled = reviews.filter(r =>
    (r._bossApproved || r._bossRejected) &&
    (r._riskLevel === "high" || r._riskLevel === "critical")
  );

  // ── 個人事項 ──
  const [items, setItems] = useState(() => readLS(LS_KEY, null) || DEFAULT_ITEMS);
  const [notes, setNotes] = useState(() => readLS(LS_NOTES_KEY, {}));
  const [collapsedMap, setCollapsedMap] = useState(() => readLS(LS_COLLAPSED_KEY, {}));
  const [activeComment, setActiveComment] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("其他");
  const [newZone, setNewZone] = useState("personal");

  const persist = (next) => { setItems(next); writeLS(LS_KEY, next); };
  const persistNotes = (next) => { setNotes(next); writeLS(LS_NOTES_KEY, next); };
  const toggleCollapsed = (id) => {
    setCollapsedMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      writeLS(LS_COLLAPSED_KEY, next);
      return next;
    });
  };

  const handleDecision = (id, decision) => {
    persist(items.map(item => item.id === id ? { ...item, status: decision, decidedAt: new Date().toISOString() } : item));
  };

  const handleSaveNote = (id) => {
    if (!commentText.trim()) return;
    const next = { ...notes, [id]: [...(notes[id] || []), { text: commentText, time: new Date().toISOString() }] };
    persistNotes(next);
    setCommentText("");
    setActiveComment(null);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    persist([{
      id: `boss-${Date.now()}`,
      title: newTitle.trim(),
      desc: newDesc.trim(),
      category: newCat,
      zone: newZone,
      status: "pending",
      createdAt: new Date().toISOString().slice(0, 10),
    }, ...items]);
    setNewTitle(""); setNewDesc("");
  };

  // 按分類分組
  const groupByCategory = (list) => {
    const groups = {};
    for (const item of list) {
      const cat = item.category || "其他";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return Object.entries(groups);
  };

  // 分區
  const personalPending = items.filter(i => i.status === "pending" && (i.zone || "personal") === "personal");
  const opsPending = items.filter(i => i.status === "pending" && i.zone === "ops");
  const decided = items.filter(i => i.status !== "pending");
  const personalDecided = decided.filter(i => (i.zone || "personal") === "personal");
  const opsDecided = decided.filter(i => i.zone === "ops");

  // 決定項渲染
  const renderDecidedItem = (item) => {
    const sc = STATUS_CFG[item.status] || STATUS_CFG.pending;
    const catColor = CAT_COLOR[item.category] || C.t3;
    const itemNotes = notes[item.id] || [];
    return <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: sc.bg, border: `1px solid ${sc.color}15`, borderRadius: 7, marginBottom: 3, transition: "all .15s" }}>
      <span style={{ fontSize: 12 }}>{sc.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
          <Badge c={catColor} bg={catColor + "10"} style={{ fontSize: 8 }}>{item.category}</Badge>
        </div>
        {itemNotes.length > 0 && <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>💬 {itemNotes[itemNotes.length - 1].text}</div>}
      </div>
      <span style={{ fontSize: 8, color: C.t3 }}>{item.decidedAt ? new Date(item.decidedAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }) : ""}</span>
      <Btn sm v="gh" onClick={() => handleDecision(item.id, "pending")} style={{ fontSize: 8, color: C.t3, padding: "2px 6px" }}>↩</Btn>
    </div>;
  };

  // 待決定卡片渲染
  const renderPendingItem = (item) => {
    const catColor = CAT_COLOR[item.category] || C.t3;
    const itemNotes = notes[item.id] || [];
    return <Card key={item.id} glow={C.amber} style={{ padding: "10px 12px", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{item.title}</span>
        <Badge c={catColor} bg={catColor + "10"} style={{ fontSize: 8 }}>{item.category}</Badge>
      </div>
      {item.desc && <div style={{ fontSize: 10, color: C.t2, lineHeight: 1.4, marginBottom: 4 }}>{item.desc}</div>}
      {itemNotes.length > 0 && <div style={{ marginBottom: 4 }}>
        {itemNotes.slice(-2).map((n, i) => <div key={i} style={{ fontSize: 9, color: C.indigo, padding: "2px 6px", background: C.indigoG, borderRadius: 4, marginBottom: 2, borderLeft: `2px solid ${C.indigo}` }}>
          💬 {n.text}
        </div>)}
      </div>}
      {activeComment === item.id && <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="備註…" autoFocus
          style={{ flex: 1, borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.t1, fontSize: 10, padding: "4px 8px", fontFamily: "inherit" }}
          onKeyDown={e => e.key === "Enter" && handleSaveNote(item.id)}
        />
        <Btn sm v="def" onClick={() => handleSaveNote(item.id)} style={{ fontSize: 9, padding: "2px 8px" }}>💾</Btn>
        <Btn sm v="gh" onClick={() => { setActiveComment(null); setCommentText(""); }} style={{ fontSize: 9, padding: "2px 6px" }}>✕</Btn>
      </div>}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        <Btn sm v="gh" onClick={() => { setActiveComment(item.id); setCommentText(""); }} style={{ fontSize: 9, padding: "2px 8px" }}>💬</Btn>
        <span style={{ flex: 1 }} />
        <Btn sm v="def" onClick={() => handleDecision(item.id, "deferred")} style={{ fontSize: 9, color: C.t3, padding: "2px 8px" }}>⏸️</Btn>
        <Btn sm v="no" onClick={() => handleDecision(item.id, "rejected")} style={{ fontSize: 9, padding: "2px 8px" }}>❌</Btn>
        <Btn sm v="ok" onClick={() => handleDecision(item.id, "approved")} style={{ fontSize: 9, padding: "2px 8px" }}>✅</Btn>
      </div>
    </Card>;
  };

  return <div>
    {/* 標題列 */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 16px", background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(192,132,252,0.06))", borderRadius: 12, border: `1px solid ${C.amber}20` }}>
      <span style={{ fontSize: 24 }}>👤</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>老蔡專區</div>
        <div style={{ fontSize: 10, color: C.t3 }}>高風險需簽核 · 個人決策 · 營運管理</div>
      </div>
      {highRiskPending.length > 0 && <Badge c={C.red} bg={C.redG}>{highRiskPending.length} 高風險</Badge>}
      <Badge c={C.amber} bg={C.amberG}>{personalPending.length + opsPending.length} 待決定</Badge>
    </div>

    {/* ════ 高風險簽核區（全寬，最優先） ════ */}
    {highRiskPending.length > 0 && <CollapsibleSec id="risk" icon="🔴" title="高風險待簽核" count={highRiskPending.length}
      badge={<Badge c={C.red} bg={C.redG}>需立即處理</Badge>}
      defaultOpen={true} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {highRiskPending.map(r => <Card key={r.id} glow={r._riskLevel === "critical" ? C.purple : C.red} style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <RiskStamp level={r._riskLevel} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.t1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
            <RiskBadge level={r._riskLevel} />
            {r._aiStamped && <Badge c={C.indigo} bg={C.indigoG} style={{ fontSize: 8 }}>🔖 AI已蓋章</Badge>}
          </div>
          <div style={{ fontSize: 10, color: C.t2, lineHeight: 1.4, marginBottom: 6 }}>{r.desc}</div>
          {r._riskStrategy && <div style={{ fontSize: 9, color: r._riskLevel === "critical" ? C.purple : C.red, marginBottom: 6, padding: "4px 8px", background: r._riskLevel === "critical" ? C.purpleG : C.redG, borderRadius: 6 }}>
            {r._riskStrategy.summary}
          </div>}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {setDrawer && <Btn sm v="def" onClick={() => setDrawer(r)} style={{ fontSize: 9 }}>🔍 詳情</Btn>}
            <span style={{ flex: 1 }} />
            {bossRejectReview && <Btn sm v="no" onClick={() => { if (confirm(`駁回「${r.title}」？`)) bossRejectReview(r.id); }} style={{ fontSize: 9 }}>❌ 駁回</Btn>}
            {bossApproveReview && <Btn sm v="ok" onClick={() => bossApproveReview(r.id)} style={{ fontSize: 9 }}>✅ 核准發布</Btn>}
          </div>
        </Card>)}
      </div>
    </CollapsibleSec>}

    {bossHandled.length > 0 && <CollapsibleSec id="risk-done" icon="📋" title="高風險已處理" count={bossHandled.length}
      defaultOpen={false} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
      {bossHandled.map(r => {
        const ok = r._bossApproved;
        return <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: ok ? C.greenG : C.redG, border: `1px solid ${ok ? C.green : C.red}15`, borderRadius: 7, marginBottom: 3 }}>
          <RiskStamp level={r._riskLevel} />
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: ok ? C.green : C.red, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
          <Badge c={ok ? C.green : C.red} bg={ok ? C.greenG : C.redG} style={{ fontSize: 8 }}>{ok ? "已核准" : "已駁回"}</Badge>
        </div>;
      })}
    </CollapsibleSec>}

    {/* ════ 雙欄：左=個人 / 右=營運 ════ */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: highRiskPending.length > 0 || bossHandled.length > 0 ? 8 : 0 }}>

      {/* ─── 左欄：個人事項 ─── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", background: "rgba(251,191,36,0.04)", border: `1px solid ${C.amber}15`, borderRadius: 8 }}>
          <span style={{ fontSize: 13 }}>🧑</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>個人事項</span>
          <span style={{ flex: 1 }} />
          <Badge c={C.amber} bg={C.amberG}>{personalPending.length} 待定</Badge>
        </div>

        {/* 新增 */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="標題"
            style={{ flex: 1, minWidth: 100, borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, color: C.t1, fontSize: 10, padding: "5px 8px", fontFamily: "inherit" }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <select value={newCat} onChange={e => setNewCat(e.target.value)}
            style={{ borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, color: C.t1, fontSize: 10, padding: "4px 6px" }}>
            {Object.keys(CAT_COLOR).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={newZone} onChange={e => setNewZone(e.target.value)}
            style={{ borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, color: C.t1, fontSize: 10, padding: "4px 6px" }}>
            <option value="personal">個人</option>
            <option value="ops">營運</option>
          </select>
          <Btn v="pri" sm onClick={handleAdd} dis={!newTitle.trim()} style={{ fontSize: 9, padding: "3px 8px" }}>➕</Btn>
        </div>

        {personalPending.length === 0 && <div style={{ textAlign: "center", padding: 16, color: C.t3, fontSize: 10 }}>沒有個人待決定事項</div>}

        {/* 依分類收合 */}
        {groupByCategory(personalPending).map(([cat, catItems]) =>
          <CollapsibleSec key={cat} id={`personal-${cat}`} icon={CAT_ICON[cat] || "📌"} title={cat} count={catItems.length}
            defaultOpen={true} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
            {catItems.map(renderPendingItem)}
          </CollapsibleSec>
        )}

        {/* 已決定（收合） */}
        {personalDecided.length > 0 && <CollapsibleSec id="personal-decided" icon="📋" title="已決定" count={personalDecided.length}
          defaultOpen={false} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
          {personalDecided.map(renderDecidedItem)}
        </CollapsibleSec>}
      </div>

      {/* ─── 右欄：營運大區 ─── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", background: "rgba(129,140,248,0.04)", border: `1px solid ${C.indigo}15`, borderRadius: 8 }}>
          <span style={{ fontSize: 13 }}>🏢</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.indigo }}>營運決策</span>
          <span style={{ flex: 1 }} />
          <Badge c={C.indigo} bg={C.indigoG}>{opsPending.length} 待定</Badge>
        </div>

        {opsPending.length === 0 && <div style={{ textAlign: "center", padding: 16, color: C.t3, fontSize: 10 }}>沒有營運待決定事項</div>}

        {/* 依分類收合 */}
        {groupByCategory(opsPending).map(([cat, catItems]) =>
          <CollapsibleSec key={cat} id={`ops-${cat}`} icon={CAT_ICON[cat] || "📌"} title={cat} count={catItems.length}
            defaultOpen={true} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
            {catItems.map(renderPendingItem)}
          </CollapsibleSec>
        )}

        {/* 已決定（收合） */}
        {opsDecided.length > 0 && <CollapsibleSec id="ops-decided" icon="📋" title="已決定" count={opsDecided.length}
          defaultOpen={false} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
          {opsDecided.map(renderDecidedItem)}
        </CollapsibleSec>}
      </div>
    </div>

    {/* 流程說明（收合） */}
    <CollapsibleSec id="flow-info" icon="📌" title="審核流程" defaultOpen={false} collapsedMap={collapsedMap} onToggle={toggleCollapsed}>
      <div style={{ padding: "8px 12px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10, color: C.t3, lineHeight: 1.7 }}>
        <div>1. AI 蓋章評估風險（🟢安全 🟡低 🟠中 🔴高 🟣極高）</div>
        <div>2. 安全/低/中 → AI 自動通過 + 轉任務</div>
        <div>3. 高/極高 → 送此專區等老蔡簽核</div>
        <div>4. 老蔡「核准發布」→ 自動轉任務執行</div>
        <div>5. 個人事項 / 營運決策在兩欄分開管理</div>
      </div>
    </CollapsibleSec>
  </div>;
}
