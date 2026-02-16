import { useEffect, useState } from "react";
import { Btn, C } from "./uiPrimitives";

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

  const handleSave = () => {
    const out = isTask ? { ...form, subs: form.subs } : isAuto ? { ...form, chain: form.chain } : form;
    onSave?.(out);
    onClose();
  };

  return <div onClick={(e) => e.target === e.currentTarget && !editing && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)", zIndex: 1000, display: "flex", justifyContent: "flex-end", animation: "oc-fi .15s" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "90vw", height: "100%", background: C.s1, borderLeft: `1px solid ${C.border}`, padding: 24, overflowY: "auto", animation: "oc-sl .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.t1 }}>{editing ? "✏️ 編輯" : "🧠 思維紀錄"}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {onSave && !editing && <Btn oc="DRAWER_EDIT" sm v="gh" onClick={() => { setForm({ ...item, subs: item.subs ? [...item.subs] : [], chain: item.chain ? [...item.chain] : [] }); setEditing(true); }}>✎ 編輯</Btn>}
          {editing
            ? <><Btn oc="DRAWER_CANCEL" sm v="gh" onClick={() => setEditing(false)}>取消</Btn><Btn oc="DRAWER_SAVE" sm v="pri" onClick={handleSave}>儲存</Btn></>
            : <Btn oc="DRAWER_CLOSE" sm v="gh" onClick={onClose}>✕</Btn>}
        </div>
      </div>

      {editing
        ? <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 11, color: C.t3 }}>標題</label>
          <input value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="標題" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 13 }} />
          {isTask && <><label style={{ fontSize: 11, color: C.t3 }}>思維 / 備註</label><textarea value={form.thought || ""} onChange={(e) => setForm((p) => ({ ...p, thought: e.target.value }))} placeholder="目前進度、思考..." rows={3} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12, resize: "vertical" }} /></>}
          {!isTask && !isAuto && <><label style={{ fontSize: 11, color: C.t3 }}>描述</label><input value={form.desc || ""} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} placeholder="描述" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 13 }} /><label style={{ fontSize: 11, color: C.t3 }}>推理 / 理由</label><textarea value={form.reasoning || ""} onChange={(e) => setForm((p) => ({ ...p, reasoning: e.target.value }))} placeholder="推理 / 理由" rows={3} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12, resize: "vertical" }} /></>}
          {isAuto && <><label style={{ fontSize: 11, color: C.t3 }}>Cron 表達式</label><input value={form.cron || ""} onChange={(e) => setForm((p) => ({ ...p, cron: e.target.value }))} placeholder="0 8 * * *" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12, fontFamily: "monospace" }} /><label style={{ fontSize: 11, color: C.t3 }}>流程鏈（逗號分隔）</label><input value={Array.isArray(form.chain) ? form.chain.join(", ") : ""} onChange={(e) => setForm((p) => ({ ...p, chain: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="Step1, Step2, Step3" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.t1, fontSize: 12 }} /></>}
          {isTask && form.subs && <><label style={{ fontSize: 11, color: C.t3 }}>子任務</label>{form.subs.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><input type="checkbox" checked={s.d} onChange={(e) => setForm((p) => ({ ...p, subs: p.subs.map((x, j) => j === i ? { ...x, d: e.target.checked } : x) }))} /><input value={s.t} onChange={(e) => setForm((p) => ({ ...p, subs: p.subs.map((x, j) => j === i ? { ...x, t: e.target.value } : x) }))} style={{ flex: 1, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, color: C.t1, fontSize: 12 }} /></div>)}</>}
        </div>
        : <>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, marginBottom: 10 }}>{item.title}</div>
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
