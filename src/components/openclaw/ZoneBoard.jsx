/**
 * ZoneBoard — 大社區分配箱面板
 *
 * 設計理念：把任務依「大分類」切成視覺區塊（Zone），
 * 每個 Zone 內含：指數評分、任務卡、協作點亮功能。
 *
 * Zones 按 taskType 分配：
 *   🔨 開發區 | 🔍 研究區 | ⚙️ 維運區 | 📋 審核區 | 📥 其他
 */
import { useState, useMemo, useCallback } from "react";
import { C, Badge, Btn, Card, Ring } from "./uiPrimitives";
import { TaskBoard } from "./panels";

// ── Zone 定義 ──
const ZONE_DEFS = [
  { key: "development", label: "開發區", icon: "🔨", color: "#818cf8", gradient: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(99,102,241,0.03))" },
  { key: "research",    label: "研究區", icon: "🔍", color: "#c084fc", gradient: "linear-gradient(135deg,rgba(192,132,252,0.12),rgba(192,132,252,0.03))" },
  { key: "ops",         label: "維運區", icon: "⚙️", color: "#34d399", gradient: "linear-gradient(135deg,rgba(52,211,153,0.12),rgba(52,211,153,0.03))" },
  { key: "review",      label: "審核區", icon: "📋", color: "#fbbf24", gradient: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.03))" },
  { key: "other",       label: "綜合區", icon: "📥", color: "#9d9daa", gradient: "linear-gradient(135deg,rgba(157,157,170,0.12),rgba(157,157,170,0.03))" },
];

// ── 指數計算 ──
// 每個任務有一個綜合指數，Zone 的指數是其內所有任務的加權平均
const RISK_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };
const COMPLEXITY_WEIGHT = { XL: 4, L: 3, M: 2, S: 1 };

function calcTaskIndex(t) {
  const progress = t.progress || 0;
  const risk = RISK_WEIGHT[t.riskLevel] || 1;
  const complexity = COMPLEXITY_WEIGHT[t.complexity] || 2;
  const statusBoost = t.status === "in_progress" ? 1.2 : t.status === "done" ? 0.3 : 1;
  const autoBoost = t.auto ? 1.1 : 1;
  // 指數 = 基礎分(風險×複雜度) × 狀態修正 × 自動化修正 - 進度扣減
  const raw = (risk * complexity * 10) * statusBoost * autoBoost;
  // 扣除已完成比例
  const adjusted = raw * (1 - progress / 100 * 0.7);
  return Math.round(Math.max(adjusted, 1));
}

function calcZoneIndex(tasks) {
  if (tasks.length === 0) return { score: 0, urgency: "idle", label: "閒置" };
  const total = tasks.reduce((s, t) => s + calcTaskIndex(t), 0);
  const avg = total / tasks.length;
  const maxSingle = Math.max(...tasks.map(calcTaskIndex));
  // 綜合指數 = 平均 × (1 + 任務數權重) + 最大單項
  const composite = Math.round(avg * (1 + tasks.length * 0.1) + maxSingle * 0.3);
  let urgency, label;
  if (composite >= 60) { urgency = "critical"; label = "高壓"; }
  else if (composite >= 35) { urgency = "high"; label = "忙碌"; }
  else if (composite >= 15) { urgency = "normal"; label = "正常"; }
  else { urgency = "low"; label = "輕鬆"; }
  return { score: composite, urgency, label };
}

const URGENCY_COLOR = { critical: "#f87171", high: "#fbbf24", normal: "#818cf8", low: "#34d399", idle: "#5c5c6a" };

// ── 降維（區域降等）機制 ──
// 被「降維」的區域，所有任務自動視為綠燈（低風險），Agent 可直接執行不需轉發老蔡
// 只有涉及金流/個資的任務不會降維
const NEEDS_BOSS = new Set(["critical"]); // 即使降維也需老蔡審的風險等級
const DEMOTE_RISK = "low"; // 降維後的風險等級

// ── localStorage 持久化 ──
const LS_LIT = "openclaw_zone_lit";
const LS_COLLAPSED = "openclaw_zone_collapsed";
const LS_DEMOTED = "openclaw_zone_demoted";
function readLS(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function writeLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

// ── 指數徽章 ──
function IndexBadge({ score, urgency }) {
  const c = URGENCY_COLOR[urgency] || URGENCY_COLOR.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 99,
      background: `${c}18`, color: c,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
    }}>
      <span style={{ fontSize: 8 }}>◆</span> {score}
    </span>
  );
}

// ── Zone 卡片 ──
function ZoneCard({
  zone, tasks, index, lit, demoted, collapsed,
  onToggle, onLit, onDemote, onProg, onView, onRun, onDelete, onMove,
}) {
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const ipTasks = tasks.filter(t => t.status === "in_progress").length;
  const avgProgress = tasks.length > 0
    ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length)
    : 0;

  const isDemoted = !!demoted;
  const isLit = !!lit;
  const litGlow = isLit ? `0 0 24px ${zone.color}30, 0 0 60px ${zone.color}15, inset 0 0 30px ${zone.color}08` : "none";
  const litBorder = isLit ? `2px solid ${zone.color}60` : isDemoted ? `1px solid ${C.green}40` : `1px solid ${C.border}`;

  return (
    <div style={{
      background: isLit ? zone.gradient : C.s2,
      border: litBorder,
      borderRadius: 14,
      overflow: "hidden",
      transition: "all .3s ease",
      boxShadow: litGlow,
      animation: isLit ? "oc-lit-pulse 2s ease-in-out infinite" : "none",
    }}>
      {/* Zone 頭部 */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : `1px solid ${C.border}`,
          background: isLit ? `${zone.color}0c` : "transparent",
        }}
      >
        <span style={{ fontSize: 18 }}>{zone.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{zone.label}</span>
            <IndexBadge score={index.score} urgency={index.urgency} />
            {isDemoted && <span style={{ fontSize: 9, color: C.green, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.greenG }}>🟢 降維</span>}
            {isLit && <span style={{ fontSize: 10, color: zone.color, fontWeight: 600 }}>🔥 趕工中</span>}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
            <span style={{ fontSize: 9, color: C.t3 }}>📦 {tasks.length} 項</span>
            <span style={{ fontSize: 9, color: C.indigo }}>🔄 {ipTasks} 進行中</span>
            <span style={{ fontSize: 9, color: C.green }}>✅ {doneTasks} 完成</span>
            {avgProgress > 0 && <span style={{ fontSize: 9, color: C.t2 }}>📊 {avgProgress}%</span>}
          </div>
        </div>
        {/* 降維按鈕 */}
        <button
          onClick={(e) => { e.stopPropagation(); onDemote(); }}
          title={isDemoted ? "取消降維 — 恢復正常風控" : "降維 — 分配後直接執行"}
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: isDemoted ? `1px solid ${C.green}60` : `1px solid ${C.border}`,
            background: isDemoted ? C.greenG : "transparent",
            color: isDemoted ? C.green : C.t3,
            fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .2s",
            fontFamily: "inherit", fontWeight: 700,
          }}
        >
          {isDemoted ? "🟢" : "⬇"}
        </button>
        {/* 點亮按鈕 */}
        <button
          onClick={(e) => { e.stopPropagation(); onLit(); }}
          title={isLit ? "取消趕工" : "點亮趕工"}
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: isLit ? `1px solid ${zone.color}60` : `1px solid ${C.border}`,
            background: isLit ? `${zone.color}25` : "transparent",
            color: isLit ? zone.color : C.t3,
            fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .2s",
          }}
        >
          {isLit ? "🔥" : "💡"}
        </button>
        {/* 進度環 */}
        <Ring pct={avgProgress} size={28} stroke={2.5} />
        <span style={{
          fontSize: 8, color: C.t3, transition: "transform .15s",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0)",
        }}>▼</span>
      </div>

      {/* Zone 內容 */}
      {!collapsed && (
        <div style={{ padding: "8px 10px 12px", animation: "oc-su .15s ease" }}>
          {/* 任務指數排行 */}
          {tasks.length > 0 && (
            <div style={{ display: "flex", gap: 3, marginBottom: 8, flexWrap: "wrap" }}>
              {tasks
                .map(t => ({ t, idx: calcTaskIndex(t) }))
                .sort((a, b) => b.idx - a.idx)
                .slice(0, 6)
                .map(({ t, idx }) => (
                  <span
                    key={t.id}
                    onClick={() => onView(t)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      padding: "2px 7px", borderRadius: 6,
                      background: C.s1, border: `1px solid ${C.border}`,
                      fontSize: 9, color: C.t2, cursor: "pointer",
                      transition: "background .15s",
                    }}
                    title={`指數 ${idx}`}
                  >
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: idx >= 30 ? "#f87171" : idx >= 15 ? "#fbbf24" : "#34d399",
                    }} />
                    <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.title ?? t.name}
                    </span>
                    <span style={{ fontWeight: 700, color: C.t1, fontSize: 8 }}>{idx}</span>
                  </span>
                ))}
            </div>
          )}

          {/* 任務卡片（用 TaskBoard grid） */}
          <TaskBoard
            bare
            tasks={tasks}
            onProg={onProg}
            onView={onView}
            onRun={onRun}
            onDelete={onDelete}
            onMove={onMove}
          />
        </div>
      )}
    </div>
  );
}

// ── 全局指數面板 ──
function GlobalDashboard({ zones }) {
  const totalTasks = zones.reduce((s, z) => s + z.tasks.length, 0);
  const totalScore = zones.reduce((s, z) => s + z.index.score, 0);
  const litCount = zones.filter(z => z.lit).length;
  const demotedCount = zones.filter(z => z.demoted).length;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
      gap: 6, marginBottom: 14,
    }}>
      <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.indigo, letterSpacing: -0.5 }}>{totalScore}</div>
        <div style={{ fontSize: 9, color: C.t3, fontWeight: 500 }}>全局指數</div>
      </div>
      <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>{totalTasks}</div>
        <div style={{ fontSize: 9, color: C.t3, fontWeight: 500 }}>總任務</div>
      </div>
      <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>{zones.filter(z => z.index.urgency === "critical" || z.index.urgency === "high").length}</div>
        <div style={{ fontSize: 9, color: C.t3, fontWeight: 500 }}>高壓區</div>
      </div>
      <div style={{ background: demotedCount > 0 ? C.greenG : C.s2, border: `1px solid ${demotedCount > 0 ? "rgba(52,211,153,0.12)" : C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: demotedCount > 0 ? C.green : C.t3 }}>{demotedCount}</div>
        <div style={{ fontSize: 9, color: C.t3, fontWeight: 500 }}>降維區</div>
      </div>
      <div style={{ background: litCount > 0 ? "rgba(248,113,113,0.08)" : C.s2, border: `1px solid ${litCount > 0 ? "rgba(248,113,113,0.12)" : C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: litCount > 0 ? "#f87171" : C.t3 }}>{litCount}</div>
        <div style={{ fontSize: 9, color: C.t3, fontWeight: 500 }}>趕工中</div>
      </div>
    </div>
  );
}

// ── 比例條 ──
function ZonePropBar({ zones }) {
  const total = zones.reduce((s, z) => s + z.tasks.length, 0);
  if (total === 0) return null;
  const visible = zones.filter(z => z.tasks.length > 0);
  return (
    <div style={{ display: "flex", gap: 1, height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
      {visible.map(z => (
        <div
          key={z.zone.key}
          title={`${z.zone.label}: ${z.tasks.length} 項 (指數 ${z.index.score})`}
          style={{
            flex: z.tasks.length,
            background: z.zone.color,
            opacity: z.lit ? 1 : 0.5,
            transition: "all .3s",
          }}
        />
      ))}
    </div>
  );
}

// ── 主元件 ──
export function ZoneBoard({ tasks, onProg, onView, onRun, onDelete, onMove, onAddQuiz }) {
  const [litMap, setLitMap] = useState(() => readLS(LS_LIT, {}));
  const [collapsedMap, setCollapsedMap] = useState(() => readLS(LS_COLLAPSED, {}));
  const [demotedMap, setDemotedMap] = useState(() => readLS(LS_DEMOTED, {}));

  const toggleLit = useCallback((key) => {
    setLitMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      writeLS(LS_LIT, next);
      return next;
    });
  }, []);

  const toggleDemoted = useCallback((key) => {
    setDemotedMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      writeLS(LS_DEMOTED, next);
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback((key) => {
    setCollapsedMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      writeLS(LS_COLLAPSED, next);
      return next;
    });
  }, []);

  // 按 taskType 分 Zone
  const zones = useMemo(() => {
    const buckets = {};
    for (const z of ZONE_DEFS) buckets[z.key] = [];
    for (const t of tasks) {
      const key = t.taskType && buckets[t.taskType] ? t.taskType : "other";
      buckets[key].push(t);
    }
    return ZONE_DEFS.map(zone => ({
      zone,
      tasks: buckets[zone.key] || [],
      index: calcZoneIndex(buckets[zone.key] || []),
      lit: !!litMap[zone.key],
      demoted: !!demotedMap[zone.key],
    }));
  }, [tasks, litMap, demotedMap]);

  // 有任務的 Zone 排前面；點亮的最優先
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      if (a.lit !== b.lit) return a.lit ? -1 : 1;
      if ((a.tasks.length > 0) !== (b.tasks.length > 0)) return a.tasks.length > 0 ? -1 : 1;
      return b.index.score - a.index.score;
    });
  }, [zones]);

  const visibleZones = sortedZones.filter(z => z.tasks.length > 0);
  const emptyZones = sortedZones.filter(z => z.tasks.length === 0);

  return (
    <div>
      {/* 全局儀表板 */}
      <GlobalDashboard zones={zones} />
      <ZonePropBar zones={zones} />

      {/* Zone 卡片 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleZones.map(({ zone, tasks: zt, index, lit, demoted }) => (
          <ZoneCard
            key={zone.key}
            zone={zone}
            tasks={zt}
            index={index}
            lit={lit}
            demoted={demoted}
            collapsed={!!collapsedMap[zone.key]}
            onToggle={() => toggleCollapsed(zone.key)}
            onLit={() => toggleLit(zone.key)}
            onDemote={() => toggleDemoted(zone.key)}
            onProg={onProg}
            onView={onView}
            onRun={onRun}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
      </div>

      {/* 空閒 Zone 摺疊顯示 */}
      {emptyZones.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
          {emptyZones.map(({ zone }) => (
            <span key={zone.key} style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "3px 10px", borderRadius: 7,
              background: C.s1, border: `1px solid ${C.border}`,
              fontSize: 9, color: C.t3,
            }}>
              {zone.icon} {zone.label} <span style={{ color: C.t3 }}>— 空</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
