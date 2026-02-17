import { useState, useMemo } from "react";
import { C, Badge, Btn } from "./uiPrimitives";
import { ReviewPanel } from "./panels";

const LS_KEY = "openclaw_multireview_groupBy";
const LS_COLLAPSED = "openclaw_multireview_collapsed";

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── 分組維度 ──
const REVIEW_DIMENSIONS = {
  pipeline: {
    label: "流程管線",
    icon: "🔄",
    accessor: (r) => {
      if (r.status === "pending") return "pending";
      if (r.status === "approved" && !r._hasTask) return "approved_idle";
      if (r.status === "approved") return "approved_tasked";
      if (r.status === "archived") return "archived";
      return r.status;
    },
    groups: [
      { key: "pending", label: "⏳ 待審核 — 過篩中", icon: "⏳", color: "#fbbf24" },
      { key: "approved_idle", label: "✅ 已通過 — 待分配", icon: "📤", color: "#34d399" },
      { key: "approved_tasked", label: "🚀 已轉任務 — 執行中", icon: "🚀", color: "#818cf8" },
      { key: "archived", label: "📥 收錄 — 暫存", icon: "📥", color: "#9d9daa" },
      { key: "rejected", label: "❌ 已駁回", icon: "❌", color: "#f87171" },
    ],
    fallback: "pending",
  },
  proposalCat: {
    label: "依構想分類",
    icon: "💡",
    accessor: (r) => {
      // 從 src 或 filePath 解析 category（格式 "agent-proposal:system"）
      const src = r.src || r.filePath || "";
      if (src.startsWith("agent-proposal:")) return src.split(":")[1];
      // 從 proposalCategory 或 tags 推斷
      if (r.proposalCategory) return r.proposalCategory;
      // 從 title emoji 推斷
      const t = r.title || "";
      if (t.startsWith("⚙️") || t.startsWith("⚙")) return "system";
      if (t.startsWith("💼")) return "commercial";
      if (t.startsWith("🔧")) return "tool";
      if (t.startsWith("🛡️") || t.startsWith("🛡")) return "risk";
      if (t.startsWith("💡")) return "creative";
      // 從 type/tags 判斷是否 proposal
      const isProposal = r.type === "proposal" || (r.tags || [])[0] === "proposal";
      return isProposal ? "_general" : "_not_proposal";
    },
    groups: [
      { key: "system", label: "⚙️ 系統基礎", icon: "⚙️", color: "#818cf8" },
      { key: "commercial", label: "💼 商業模式", icon: "💼", color: "#fbbf24" },
      { key: "tool", label: "🔧 工具", icon: "🔧", color: "#34d399" },
      { key: "risk", label: "🛡️ 風險防護", icon: "🛡️", color: "#f87171" },
      { key: "creative", label: "💡 創意願景", icon: "💡", color: "#c084fc" },
      { key: "_general", label: "📋 一般提案", icon: "📋", color: "#9d9daa" },
      { key: "_not_proposal", label: "🔍 其他審核", icon: "🔍", color: "#5c5c6a" },
    ],
    fallback: "_general",
  },
  type: {
    label: "依來源類型",
    icon: "🏷️",
    accessor: (r) => r.type || r.tags?.[0],
    groups: [
      { key: "proposal", label: "💡 發想提案", icon: "💡", color: "#fbbf24" },
      { key: "tool", label: "⚙️ 工具", icon: "⚙️", color: "#818cf8" },
      { key: "skill", label: "🧠 技能", icon: "🧠", color: "#c084fc" },
      { key: "issue", label: "🔧 問題", icon: "🔧", color: "#f87171" },
      { key: "learn", label: "📚 學習", icon: "📚", color: "#34d399" },
      { key: "red_alert", label: "🚨 警戒", icon: "🚨", color: "#ef4444" },
    ],
    fallback: "tool",
  },
  status: {
    label: "依狀態",
    icon: "📋",
    accessor: (r) => r.status,
    groups: [
      { key: "pending", label: "待審核", icon: "⏳", color: "#fbbf24" },
      { key: "approved", label: "已批准", icon: "✅", color: "#34d399" },
      { key: "archived", label: "收錄中", icon: "📥", color: "#9d9daa" },
      { key: "rejected", label: "已駁回", icon: "❌", color: "#f87171" },
    ],
    fallback: "pending",
  },
};

function groupReviewsBy(reviews, dimensionKey) {
  const dim = REVIEW_DIMENSIONS[dimensionKey];
  if (!dim) return [{ groupKey: "all", groupMeta: { key: "all", label: "全部", icon: "🔍", color: "#818cf8" }, reviews }];

  const buckets = new Map();
  for (const g of dim.groups) {
    buckets.set(g.key, { groupKey: g.key, groupMeta: g, reviews: [] });
  }
  for (const r of reviews) {
    let key = dim.accessor(r);
    if (key === undefined || key === null || key === "") key = dim.fallback;
    if (!buckets.has(key)) {
      buckets.set(key, { groupKey: key, groupMeta: { key, label: key, icon: "📌", color: "#9d9daa" }, reviews: [] });
    }
    buckets.get(key).reviews.push(r);
  }
  return Array.from(buckets.values());
}

// ── 分組選擇器 ──
function GroupBySelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "6px 0 10px", overflowX: "auto" }}>
      {Object.entries(REVIEW_DIMENSIONS).map(([key, dim]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            border: value === key ? `1px solid ${C.indigo}40` : `1px solid ${C.border}`,
            background: value === key ? C.indigoG : "transparent",
            color: value === key ? C.indigo : C.t3,
            fontSize: 11,
            fontWeight: value === key ? 650 : 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            transition: "all .15s",
          }}
        >
          {dim.icon} {dim.label}
        </button>
      ))}
    </div>
  );
}

// ── 統計條 ──
function ReviewStats({ reviews }) {
  const pending = reviews.filter(r => r.status === "pending").length;
  const approved = reviews.filter(r => r.status === "approved").length;
  const archived = reviews.filter(r => r.status === "archived").length;
  const rejected = reviews.filter(r => r.status === "rejected").length;
  const items = [
    { l: "待審核", v: pending, c: "#fbbf24" },
    { l: "已通過", v: approved, c: "#34d399" },
    { l: "收錄", v: archived, c: "#9d9daa" },
    { l: "駁回", v: rejected, c: "#f87171" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
      {items.map((s, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 7,
          background: `${s.c}12`, border: `1px solid ${s.c}20`,
          fontSize: 10, fontWeight: 600, color: s.c,
        }}>
          {s.l} <span style={{ fontWeight: 800 }}>{s.v}</span>
        </span>
      ))}
    </div>
  );
}

// ── 批量操作列 ──
function BatchActions({ reviews, onArchive }) {
  const approvedIdle = reviews.filter(r => r.status === "approved");
  if (approvedIdle.length === 0 || !onArchive) return null;

  const handleBatchArchive = () => {
    if (!window.confirm(`確定將 ${approvedIdle.length} 筆已通過項目歸檔？`)) return;
    for (const r of approvedIdle) {
      onArchive(r.id, "archive");
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px", marginBottom: 10,
      background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8,
    }}>
      <span style={{ fontSize: 10, color: C.t3, flex: 1 }}>
        📦 {approvedIdle.length} 筆已通過項目佔用空間
      </span>
      <Btn sm v="def" onClick={handleBatchArchive} style={{ fontSize: 9 }}>
        📥 全部歸檔
      </Btn>
    </div>
  );
}

// ── 分組區塊 ──
function ReviewSection({ groupMeta, count, avgProgress, collaboratorCount, collapsed, onToggle, children }) {
  const pct = avgProgress ?? 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: C.s2,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: collapsed ? 0 : 8,
          transition: "all .15s",
          borderLeft: `3px solid ${groupMeta.color}`,
        }}
      >
        <span style={{ fontSize: 14 }}>{groupMeta.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 650, color: C.t1, flex: 1 }}>{groupMeta.label}</span>
        {collaboratorCount > 0 && (
          <span style={{ fontSize: 9, color: C.t3 }} title={`${collaboratorCount} 位協作者`}>
            👥{collaboratorCount}
          </span>
        )}
        {pct > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: pct === 100 ? C.green : pct > 50 ? C.amber : C.indigo }}>
            {pct}%
          </span>
        )}
        <Badge c={groupMeta.color} bg={groupMeta.color + "15"}>{count}</Badge>
        <span style={{ fontSize: 11, color: C.t3, transition: "transform .2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}>
          ▼
        </span>
      </div>
      {/* 迷你進度條 */}
      {!collapsed && pct > 0 && (
        <div style={{ height: 2, background: "rgba(255,255,255,0.03)", borderRadius: 1, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: groupMeta.color, opacity: 0.5, borderRadius: 1, transition: "width .3s" }} />
        </div>
      )}
      {!collapsed && <div style={{ animation: "oc-su .15s ease" }}>{children}</div>}
    </div>
  );
}

// ── 比例條 ──
function ReviewPropBar({ groups }) {
  const total = groups.reduce((s, g) => s + g.reviews.length, 0);
  if (total === 0) return null;
  const visible = groups.filter(g => g.reviews.length > 0);
  return (
    <div style={{ display: "flex", gap: 1, height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
      {visible.map(g => (
        <div
          key={g.groupKey}
          title={`${g.groupMeta.label}: ${g.reviews.length}`}
          style={{ flex: g.reviews.length, background: g.groupMeta.color, opacity: 0.6, transition: "flex .3s" }}
        />
      ))}
    </div>
  );
}

// ── 主元件 ──
export function MultiReview({ reviews, onOk, onNo, onView, onOkAndCreateTask, onArchive }) {
  const [groupBy, setGroupBy] = useState(() => readLS(LS_KEY, null) ?? "pipeline");
  const [collapsedMap, setCollapsedMap] = useState(() => readLS(LS_COLLAPSED, {}));

  const handleGroupByChange = (key) => {
    setGroupBy(key);
    writeLS(LS_KEY, key);
  };

  const toggleCollapsed = (groupKey) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      writeLS(LS_COLLAPSED, next);
      return next;
    });
  };

  const groups = useMemo(() => groupReviewsBy(reviews, groupBy), [reviews, groupBy]);
  const visibleGroups = groups.filter((g) => g.reviews.length > 0);

  return (
    <>
      <ReviewStats reviews={reviews} />
      <GroupBySelector value={groupBy} onChange={handleGroupByChange} />
      <BatchActions reviews={reviews} onArchive={onArchive} />
      <ReviewPropBar groups={visibleGroups} />

      {visibleGroups.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 12 }}>目前沒有審核項目</div>
      )}
      {visibleGroups.map(({ groupKey, groupMeta, reviews: groupReviews }) => {
        const avgProg = groupReviews.length > 0
          ? Math.round(groupReviews.reduce((s, r) => s + (r.progress ?? 0), 0) / groupReviews.length)
          : 0;
        const uniqueCollabs = new Set();
        groupReviews.forEach(r => (r.collaborators || []).forEach(c => uniqueCollabs.add(c.name || c)));
        return <ReviewSection
          key={groupKey}
          groupMeta={groupMeta}
          count={groupReviews.length}
          avgProgress={avgProg}
          collaboratorCount={uniqueCollabs.size}
          collapsed={!!collapsedMap[groupKey]}
          onToggle={() => toggleCollapsed(groupKey)}
        >
          <ReviewPanel
            reviews={groupReviews}
            onOk={onOk}
            onNo={onNo}
            onView={onView}
            onOkAndCreateTask={onOkAndCreateTask}
            onArchive={onArchive}
          />
        </ReviewSection>;
      })}
    </>
  );
}
