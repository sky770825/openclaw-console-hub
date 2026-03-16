import { useState } from "react";
import { C } from "../uiPrimitives";
import { Stats } from "../panels";
import { MultiBoard } from "../MultiBoard";
import { ZoneBoard } from "../ZoneBoard";

const LS_MODE = "openclaw_task_mode";
const modes = [
  { key: "zone", label: "🏗 分配箱", desc: "大區塊 + 指數 + 點亮" },
  { key: "multi", label: "📊 分組板", desc: "依維度分組" },
];

export function renderTasksTab(data, actions) {
  const { autos, reviews, tasks } = data;
  const { setDrawer, progT, runT, delT, moveT, addQuiz } = actions;

  return <>
    <Stats tasks={tasks} autos={autos} reviews={reviews} />
    <TaskModeSwitch
      tasks={tasks}
      onProg={progT}
      onView={setDrawer}
      onRun={runT}
      onDelete={delT}
      onMove={moveT}
      onAddQuiz={addQuiz}
    />
  </>;
}

function TaskModeSwitch({ tasks, onProg, onView, onRun, onDelete, onMove, onAddQuiz }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(LS_MODE) || "zone"; } catch { return "zone"; }
  });
  const changeMode = (m) => { setMode(m); try { localStorage.setItem(LS_MODE, m); } catch {} };

  return (
    <div>
      {/* 模式切換 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => changeMode(m.key)}
            style={{
              padding: "5px 12px", borderRadius: 8,
              border: mode === m.key ? `1px solid ${C.indigo}40` : `1px solid ${C.border}`,
              background: mode === m.key ? C.indigoG : "transparent",
              color: mode === m.key ? C.indigo : C.t3,
              fontSize: 11, fontWeight: mode === m.key ? 650 : 500,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              transition: "all .15s",
            }}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "zone" ? (
        <ZoneBoard tasks={tasks} onProg={onProg} onView={onView} onRun={onRun} onDelete={onDelete} onMove={onMove} onAddQuiz={onAddQuiz} />
      ) : (
        <MultiBoard tasks={tasks} onProg={onProg} onView={onView} onRun={onRun} onDelete={onDelete} onMove={onMove} onAddQuiz={onAddQuiz} />
      )}
    </div>
  );
}
