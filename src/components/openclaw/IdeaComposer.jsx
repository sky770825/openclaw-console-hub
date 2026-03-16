import { useState } from "react";
import { C, Btn, Card } from "./uiPrimitives";

const CATEGORIES = [
  { key: "commercial", label: "商業", icon: "\u{1F4BC}" },
  { key: "system", label: "系統", icon: "\u2699\uFE0F" },
  { key: "tool", label: "工具", icon: "\u{1F527}" },
  { key: "risk", label: "風險", icon: "\u{1F6E1}\uFE0F" },
  { key: "creative", label: "創意", icon: "\u{1F4A1}" },
];

const EMPTY = { title: "", category: "creative", background: "", idea: "", goal: "", risk: "" };

export function IdeaComposer({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit = form.title.trim() && form.category && form.background.trim() && form.idea.trim();

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const ok = await onSubmit({
        title: form.title.trim(),
        category: form.category,
        background: form.background.trim(),
        idea: form.idea.trim(),
        goal: form.goal.trim() || undefined,
        risk: form.risk.trim() || undefined,
      });
      if (ok !== false) {
        setForm(EMPTY);
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setForm(EMPTY);
    setOpen(false);
  };

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: C.s2,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 14,
          transition: "all .15s",
          borderLeft: `3px solid ${C.purple}`,
        }}
      >
        <span style={{ fontSize: 15 }}>{"\u{1F4A1}"}</span>
        <span style={{ fontSize: 13, fontWeight: 650, color: C.t1, flex: 1 }}>新增構想</span>
        <span style={{ fontSize: 11, color: C.t3 }}>{"\u25BC"}</span>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    background: C.s1,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.t1,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: C.t2,
    marginBottom: 4,
    display: "block",
  };

  return (
    <Card style={{ marginBottom: 14, borderLeft: `3px solid ${C.purple}`, animation: "oc-su .15s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>{"\u{1F4A1}"}</span>
        <span style={{ fontSize: 13, fontWeight: 650, color: C.t1, flex: 1 }}>新增構想</span>
        <span
          onClick={handleCancel}
          style={{ fontSize: 11, color: C.t3, cursor: "pointer" }}
        >
          {"\u25B2"} 收合
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* 標題 */}
        <div>
          <label style={labelStyle}>標題 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例：建立自動化測試流程"
            style={inputStyle}
          />
        </div>

        {/* 分類 */}
        <div>
          <label style={labelStyle}>分類 *</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => set("category", cat.key)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: form.category === cat.key ? `1px solid ${C.purple}40` : `1px solid ${C.border}`,
                  background: form.category === cat.key ? `${C.purple}18` : "transparent",
                  color: form.category === cat.key ? C.purple : C.t3,
                  fontSize: 11,
                  fontWeight: form.category === cat.key ? 650 : 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all .15s",
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 背景 */}
        <div>
          <label style={labelStyle}>背景 *</label>
          <textarea
            value={form.background}
            onChange={(e) => set("background", e.target.value)}
            placeholder="為什麼需要這個構想？目前遇到什麼問題？"
            rows={2}
            style={inputStyle}
          />
        </div>

        {/* 構想 */}
        <div>
          <label style={labelStyle}>構想內容 *</label>
          <textarea
            value={form.idea}
            onChange={(e) => set("idea", e.target.value)}
            placeholder="具體的想法和做法是什麼？"
            rows={3}
            style={inputStyle}
          />
        </div>

        {/* 目標（選填） */}
        <div>
          <label style={labelStyle}>目標 <span style={{ fontWeight: 400, color: C.t3 }}>（選填）</span></label>
          <input
            type="text"
            value={form.goal}
            onChange={(e) => set("goal", e.target.value)}
            placeholder="期望達成什麼效果？"
            style={inputStyle}
          />
        </div>

        {/* 風險（選填） */}
        <div>
          <label style={labelStyle}>風險評估 <span style={{ fontWeight: 400, color: C.t3 }}>（選填）</span></label>
          <input
            type="text"
            value={form.risk}
            onChange={(e) => set("risk", e.target.value)}
            placeholder="可能有什麼風險或注意事項？"
            style={inputStyle}
          />
        </div>

        {/* 按鈕列 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <Btn sm v="gh" onClick={handleCancel}>取消</Btn>
          <Btn sm v="pri" onClick={handleSubmit} disabled={!canSubmit || busy} style={{ opacity: canSubmit && !busy ? 1 : 0.5 }}>
            {busy ? "\u23F3 提交中..." : "\u{1F4E4} 提交構想"}
          </Btn>
        </div>
      </div>
    </Card>
  );
}
