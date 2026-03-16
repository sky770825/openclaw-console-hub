import { useState } from "react";
import { C, Badge } from "./uiPrimitives";
import { TaskBoard } from "./panels";
import { groupTasksBy, GROUP_DIMENSIONS } from "./boardUtils";

const LS_KEY = "openclaw_multiboard_groupBy";
const LS_COLLAPSED = "openclaw_multiboard_collapsed";

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function GroupBySelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "6px 0 10px", overflowX: "auto" }}>
      {Object.entries(GROUP_DIMENSIONS).map(([key, dim]) => (
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

function BoardSummaryBar({ groups }) {
  const total = groups.reduce((s, g) => s + g.tasks.length, 0);
  if (total === 0) return null;
  const visible = groups.filter((g) => g.tasks.length > 0);
  return (
    <div style={{ display: "flex", gap: 1, height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 14 }}>
      {visible.map((g) => (
        <div
          key={g.groupKey}
          title={`${g.groupMeta.label}: ${g.tasks.length}`}
          style={{ flex: g.tasks.length, background: g.groupMeta.color, opacity: 0.6, transition: "flex .3s" }}
        />
      ))}
    </div>
  );
}

function BoardSection({ groupMeta, tasks, collapsed, onToggle, children }) {
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
        <Badge c={groupMeta.color} bg={groupMeta.color + "15"}>{tasks.length}</Badge>
        <span style={{ fontSize: 11, color: C.t3, transition: "transform .2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}>
          ▼
        </span>
      </div>
      {!collapsed && <div style={{ animation: "oc-su .15s ease" }}>{children}</div>}
    </div>
  );
}

export function MultiBoard({ tasks, onProg, onView, onRun, onDelete, onMove, onAddQuiz }) {
  const [groupBy, setGroupBy] = useState(() => readLS(LS_KEY, null) ?? "all");
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

  // "全部" → render single TaskBoard as before
  if (groupBy === "all") {
    return (
      <>
        <GroupBySelector value={groupBy} onChange={handleGroupByChange} />
        <TaskBoard tasks={tasks} onProg={onProg} onView={onView} onRun={onRun} onDelete={onDelete} onMove={onMove} onAddQuiz={onAddQuiz} />
      </>
    );
  }

  const groups = groupTasksBy(tasks, groupBy);
  const visibleGroups = groups.filter((g) => g.tasks.length > 0);

  return (
    <>
      <GroupBySelector value={groupBy} onChange={handleGroupByChange} />
      <BoardSummaryBar groups={visibleGroups} />
      {visibleGroups.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 12 }}>目前沒有任務</div>
      )}
      {visibleGroups.map(({ groupKey, groupMeta, tasks: groupTasks }) => (
        <BoardSection
          key={groupKey}
          groupMeta={groupMeta}
          tasks={groupTasks}
          collapsed={!!collapsedMap[groupKey]}
          onToggle={() => toggleCollapsed(groupKey)}
        >
          <TaskBoard
            bare
            tasks={groupTasks}
            onProg={onProg}
            onView={onView}
            onRun={onRun}
            onDelete={onDelete}
            onMove={onMove}
          />
        </BoardSection>
      ))}
    </>
  );
}
