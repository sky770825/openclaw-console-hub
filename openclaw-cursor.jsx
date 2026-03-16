import { C, Pulse, Btn } from "./src/components/openclaw/uiPrimitives";
import { Drawer } from "./src/components/openclaw/Drawer";
import { ResetGatewayBtn } from "./src/components/openclaw/ResetGatewayBtn";
import { DispatchToggle } from "./src/components/openclaw/DispatchToggle";
import { TAB_ITEMS, renderTabContent } from "./src/components/openclaw/tabRegistry";
import { getApiDisplayLabel } from "./src/services/openclawBoardApi";
import { useOpenClawBoard } from "./src/hooks/useOpenClawBoard";
import { useState } from "react";

// ═══════════════════════════════════════════════════════
//  OpenClaw v4 — Ultimate Agentic Task Board
//  n8n Orchestration · Telegram Bridge · API Layer
//  RBAC Auth · Security Hardening · Plugin System
// ═══════════════════════════════════════════════════════

export default function OpenClawV4() {
  const {
    autos,
    reviews,
    tasks,
    drawer,
    notice,
    boardConfig,
    evo,
    setDrawer,
    setNotice,
    togA,
    okR,
    noR,
    archiveR,
    okRAndCreateTask,
    handleDrawerSave,
    progT,
    runT,
    runA,
    delT,
    moveT,
    addQuiz,
    submitIdea,
    approveRiskItems,
    commentR,
    autoReviewByRisk,
    bossApproveReview,
    bossRejectReview,
    batchProgTasks,
    activateQueuedTasks,
    aiStrategy,
    setAiStrategy,
    errorAccum,
    wakePanel,
    dismissWake,
    createFixTasks,
    cleanOrphans,
    ConfirmDialogRoot,
  } = useOpenClawBoard();

  const [tab, setTab] = useState("all");

  return <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box", background: C.bg, color: C.t1, fontFamily: "'Geist','SF Pro Display',-apple-system,sans-serif" }}>
    <style>{`
      @keyframes oc-p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(2)}}
      @keyframes oc-fi{from{opacity:0}to{opacity:1}}
      @keyframes oc-sl{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes oc-su{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes oc-lit-pulse{0%,100%{box-shadow:0 0 24px rgba(248,113,113,0.15)}50%{box-shadow:0 0 40px rgba(248,113,113,0.25),0 0 60px rgba(248,113,113,0.1)}}
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box}
      @media (max-width:900px){.oc-grid-all{grid-template-columns:1fr!important}}
      @media (max-width:600px){.oc-task-cols{grid-template-columns:1fr!important}}
      *{scrollbar-width:thin;scrollbar-color:#1a1a24 transparent}
      ::placeholder{color:${C.t3}}
    `}</style>

    <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(6,6,10,0.9)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.indigoD},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: `0 4px 14px ${C.indigoG}` }}>🦀</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2 }}>OpenClaw<span style={{ fontWeight: 400, color: C.t3, marginLeft: 7, fontSize: 12 }}>Agent Board</span></h1>
          <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>Supabase + Telegram · 任務自動化控制台</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <DispatchToggle />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Pulse c={C.green} s={5} /><span style={{ fontSize: 11, color: C.green, fontWeight: 500 }}>Online</span>
        </div>
        <div style={{ fontSize: 10, color: C.t3 }}>API: {getApiDisplayLabel()}</div>
        <ResetGatewayBtn />
      </div>
    </div>

    {notice && <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, background: notice.type === "err" ? C.redG : C.greenG, color: notice.type === "err" ? C.red : C.green, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span>{notice.msg}</span>
      <Btn sm v="gh" onClick={() => setNotice(null)} style={{ color: notice.type === "err" ? C.red : C.green }}>關閉</Btn>
    </div>}

    <div style={{ padding: "8px 24px", display: "flex", gap: 2, borderBottom: "1px solid rgba(255,255,255,0.02)", background: "rgba(6,6,10,0.5)", overflowX: "auto" }}>
      {TAB_ITEMS.map((t) => <button key={t.key} data-oc-action={`TAB_${t.key.toUpperCase()}`} onClick={() => setTab(t.key)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: tab === t.key ? "rgba(255,255,255,0.06)" : "transparent", color: tab === t.key ? C.t1 : C.t3, fontSize: 12, fontWeight: tab === t.key ? 600 : 500, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap", fontFamily: "inherit" }}>{t.label}</button>)}
    </div>

    <div style={{ padding: "16px 20px", maxWidth: 1440, width: "100%", margin: "0 auto", animation: "oc-su .2s ease", overflowX: "hidden", minWidth: 0 }} key={tab}>
      {renderTabContent(
        tab,
        { autos, reviews, tasks, boardConfig, evo },
        { setDrawer, togA, runA, okR, noR, archiveR, okRAndCreateTask, progT, runT, delT, moveT, addQuiz, submitIdea, approveRiskItems, commentR, autoReviewByRisk, bossApproveReview, bossRejectReview, batchProgTasks, activateQueuedTasks, aiStrategy, setAiStrategy, errorAccum, wakePanel, dismissWake, createFixTasks, cleanOrphans }
      )}
    </div>

    {drawer && <Drawer item={drawer} onClose={() => setDrawer(null)} onSave={handleDrawerSave} />}
    {ConfirmDialogRoot}
  </div>;
}
