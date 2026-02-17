import { useEffect, useState } from "react";
import { Btn, Badge, C, Ring } from "./uiPrimitives";

const STATUS_LABEL = { pending: "⏳ 待審核", approved: "✅ 已批准", rejected: "❌ 已駁回", archived: "📥 收錄中" };
const STATUS_COLOR = { pending: C.amber, approved: C.green, rejected: C.red, archived: C.t3 };
const CAT_LABEL = { system: "⚙️ 系統基礎", commercial: "💼 商業模式", tool: "🔧 工具", risk: "🛡️ 風險防護", creative: "💡 創意願景" };
const TYPE_ICON = { proposal: "💡", tool: "⚙️", skill: "🧠", issue: "🔧", learn: "📚", red_alert: "🚨" };

/** 解析構想描述段落 */
function parseProposalDesc(text) {
  if (!text) return null;
  const sections = [];
  const regex = /【([^】]+)】([^【]*)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    sections.push({ label: match[1].trim(), content: match[2].trim() });
  }
  return sections.length > 0 ? sections : null;
}

/** 從 src 欄位推斷 proposalCategory */
function inferCategory(item) {
  if (item.proposalCategory) return item.proposalCategory;
  const src = item.src || item.filePath || "";
  if (src.startsWith("agent-proposal:")) return src.split(":")[1];
  return null;
}

/** Review 詳情面板 */
function ReviewDetail({ item }) {
  const cat = inferCategory(item);
  const desc = item.desc || item.summary || "";
  const reasoning = item.reasoning || item.reviewNote || "";
  const sections = parseProposalDesc(desc);
  const progress = item.progress ?? 0;
  const collaborators = item.collaborators || [];

  return <>
    {/* 狀態 + 分類標籤列 */}
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      <Badge c={STATUS_COLOR[item.status] || C.t3} bg={(STATUS_COLOR[item.status] || C.t3) + "15"}>
        {STATUS_LABEL[item.status] || item.status}
      </Badge>
      {cat && <Badge c={C.purple} bg={C.purpleG}>{CAT_LABEL[cat] || cat}</Badge>}
      {item.type && <Badge c={C.cyan} bg={C.cyanG}>{TYPE_ICON[item.type] || "📌"} {item.type}</Badge>}
      {item.pri && <Badge c={item.pri === "critical" ? C.red : item.pri === "high" ? C.amber : C.green}
        bg={item.pri === "critical" ? C.redG : item.pri === "high" ? C.amberG : C.greenG}>
        {item.pri}
      </Badge>}
    </div>

    {/* 進度條 */}
    {progress > 0 && <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 650, color: C.t3, letterSpacing: 0.3 }}>完成進度</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? C.green : progress > 50 ? C.amber : C.indigo }}>{progress}%</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? C.green : progress > 50 ? C.amber : C.indigo, borderRadius: 3, transition: "width .4s ease" }} />
      </div>
    </div>}

    {/* 結構化描述段落 */}
    {sections ? (
      <div style={{ marginBottom: 16 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 10, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 650, color: C.indigo, marginBottom: 4, letterSpacing: 0.3 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.content}</div>
          </div>
        ))}
      </div>
    ) : desc ? (
      <div style={{ marginBottom: 16, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, fontWeight: 650, color: C.t3, marginBottom: 4, letterSpacing: 0.3 }}>描述</div>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{desc}</div>
      </div>
    ) : null}

    {/* 推理 / AI 分析 */}
    {reasoning && (
      <div style={{ background: C.indigoG, border: "1px solid rgba(99,102,241,0.1)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.indigo, fontWeight: 650, marginBottom: 6, letterSpacing: 0.4 }}>AI 推理 / 審核紀錄</div>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{reasoning}</div>
      </div>
    )}

    {/* 協作參與者 */}
    {collaborators.length > 0 && (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 650, color: C.t3, marginBottom: 8, letterSpacing: 0.3 }}>協作參與者</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {collaborators.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: `hsl(${(c.name || c).charCodeAt(0) * 37 % 360},60%,45%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                {(c.name || c).charAt(0).toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: C.t1, fontWeight: 500 }}>{c.name || c}</span>
              {c.role && <span style={{ fontSize: 9, color: C.t3 }}>({c.role})</span>}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 來源 + 日期 */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: C.t3, marginBottom: 16 }}>
      {item.src && <span>來源：<span style={{ color: C.t2 }}>{item.src}</span></span>}
      {item.filePath && !item.src && <span>來源：<span style={{ color: C.t2 }}>{item.filePath}</span></span>}
      {(item.date || item.createdAt) && <span>日期：<span style={{ color: C.t2 }}>{item.date || new Date(item.createdAt).toLocaleDateString("zh-TW")}</span></span>}
      {item.reviewedAt && <span>審核：<span style={{ color: C.t2 }}>{new Date(item.reviewedAt).toLocaleDateString("zh-TW")}</span></span>}
    </div>

    {/* Tags */}
    {item.tags && item.tags.length > 0 && (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {item.tags.map((t, i) => (
          <span key={i} style={{ fontSize: 9, padding: "2px 8px", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 5, color: C.t3 }}>
            {t}
          </span>
        ))}
      </div>
    )}
  </>;
}

export function Drawer({ item, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({ ...item, subs: item.subs ? [...item.subs] : [], chain: item.chain ? [...item.chain] : [] }));

  useEffect(() => {
    if (!item) return;
    setForm({ ...item, subs: item.subs ? [...item.subs] : [], chain: item.chain ? [...item.chain] : [] });
    setEditing(false);
  }, [item]);

  if (!item) return null;

  const isTask = item.subs !== undefined;
  const isAuto = item.chain !== undefined;
  const isReview = !isTask && !isAuto && (item.status === "pending" || item.status === "approved" || item.status === "rejected" || item.status === "archived");

  const handleSave = () => {
    const out = isTask ? { ...form, subs: form.subs } : isAuto ? { ...form, chain: form.chain } : form;
    onSave?.(out);
    onClose();
  };

  const drawerTitle = isReview ? "📋 構想詳情" : isAuto ? "⚡ 自動化詳情" : isTask ? "🧠 任務詳情" : "🧠 思維紀錄";

  return <div onClick={(e) => e.target === e.currentTarget && !editing && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)", zIndex: 1000, display: "flex", justifyContent: "flex-end", animation: "oc-fi .15s" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: "90vw", height: "100%", background: C.s1, borderLeft: `1px solid ${C.border}`, padding: 24, overflowY: "auto", animation: "oc-sl .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.t1 }}>{editing ? "✏️ 編輯" : drawerTitle}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {onSave && !editing && !isReview && <Btn oc="DRAWER_EDIT" sm v="gh" onClick={() => { setForm({ ...item, subs: item.subs ? [...item.subs] : [], chain: item.chain ? [...item.chain] : [] }); setEditing(true); }}>✎ 編輯</Btn>}
          {editing
            ? <><Btn oc="DRAWER_CANCEL" sm v="gh" onClick={() => setEditing(false)}>取消</Btn><Btn oc="DRAWER_SAVE" sm v="pri" onClick={handleSave}>儲存</Btn></>
            : <Btn oc="DRAWER_CLOSE" sm v="gh" onClick={onClose}>✕</Btn>}
        </div>
      </div>

      {/* 標題 */}
      <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 14, lineHeight: 1.4 }}>{item.title || item.name}</div>

      {editing
        ? <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 11, color: C.t3 }}>標題</label>
          <input value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="標題" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 13 }} />
          {isTask && <><label style={{ fontSize: 11, color: C.t3 }}>思維 / 備註</label><textarea value={form.thought || ""} onChange={(e) => setForm((p) => ({ ...p, thought: e.target.value }))} placeholder="目前進度、思考..." rows={3} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12, resize: "vertical" }} /></>}
          {!isTask && !isAuto && <><label style={{ fontSize: 11, color: C.t3 }}>描述</label><input value={form.desc || ""} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} placeholder="描述" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 13 }} /><label style={{ fontSize: 11, color: C.t3 }}>推理 / 理由</label><textarea value={form.reasoning || ""} onChange={(e) => setForm((p) => ({ ...p, reasoning: e.target.value }))} placeholder="推理 / 理由" rows={3} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12, resize: "vertical" }} /></>}
          {isAuto && <><label style={{ fontSize: 11, color: C.t3 }}>Cron 表達式</label><input value={form.cron || ""} onChange={(e) => setForm((p) => ({ ...p, cron: e.target.value }))} placeholder="0 8 * * *" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12, fontFamily: "monospace" }} /><label style={{ fontSize: 11, color: C.t3 }}>流程鏈（逗號分隔）</label><input value={Array.isArray(form.chain) ? form.chain.join(", ") : ""} onChange={(e) => setForm((p) => ({ ...p, chain: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="Step1, Step2, Step3" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12 }} /></>}
          {isTask && form.subs && <><label style={{ fontSize: 11, color: C.t3 }}>子任務</label>{form.subs.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><input type="checkbox" checked={s.d} onChange={(e) => setForm((p) => ({ ...p, subs: p.subs.map((x, j) => j === i ? { ...x, d: e.target.checked } : x) }))} /><input value={s.t} onChange={(e) => setForm((p) => ({ ...p, subs: p.subs.map((x, j) => j === i ? { ...x, t: e.target.value } : x) }))} style={{ flex: 1, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, color: C.t1, fontSize: 12 }} /></div>)}</>}
        </div>
        : isReview
          ? <ReviewDetail item={item} />
          : <>
            {/* Task / Auto 原有顯示 */}
            {isTask && item.progress !== undefined && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 650, color: C.t3 }}>完成進度</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.progress === 100 ? C.green : item.progress > 50 ? C.amber : C.indigo }}>{item.progress}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.progress}%`, background: item.progress === 100 ? C.green : item.progress > 50 ? C.amber : C.indigo, borderRadius: 3, transition: "width .4s ease" }} />
                </div>
              </div>
            )}
            <div style={{ background: C.indigoG, border: "1px solid rgba(99,102,241,0.1)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.indigo, fontWeight: 650, marginBottom: 6, letterSpacing: 0.4 }}>REASONING LOG</div>
              <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{item.reasoning || item.thought || "—"}</div>
            </div>
            {item.subs && <><div style={{ fontSize: 10, color: C.t3, fontWeight: 650, marginBottom: 6, letterSpacing: 0.4 }}>SUBTASKS</div>{item.subs.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: s.d ? C.t3 : C.t2, marginBottom: 5 }}><span style={{ width: 15, height: 15, borderRadius: 4, border: s.d ? "none" : `1.5px solid ${C.t3}`, background: s.d ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", flexShrink: 0 }}>{s.d && "✓"}</span><span style={{ textDecoration: s.d ? "line-through" : "none" }}>{s.t}</span></div>)}</>}
            {item.chain && <><div style={{ fontSize: 10, color: C.t3, fontWeight: 650, marginBottom: 6 }}>流程鏈</div><div style={{ fontSize: 12, color: C.t2 }}>{item.chain.join(" → ")}</div></>}
          </>}
    </div>
  </div>;
}
