import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  C,
  Pulse,
  Badge,
  RiskBadge,
  RiskStamp,
  RISK_COLORS,
  Ring,
  Btn,
  Card,
  Sec,
} from "./uiPrimitives";
import {
  FALLBACK_N8N,
  FALLBACK_API,
  FALLBACK_SECURITY,
  FALLBACK_RBAC,
  FALLBACK_PLUGINS,
} from "@/data/openclawBoardFallback";
import {
  apiUrl,
  apiHeaders,
  fetchSessionState,
  fetchSessionCommands,
  fetchSessionInterrupts,
} from "@/services/openclawBoardApi";

const DRAG_TYPE = "application/x-openclaw-task-id";

export function Stats({tasks,autos,reviews}){
  const d=tasks.filter(t=>t.status==="done").length, ip=tasks.filter(t=>t.status==="in_progress").length;
  const avg=tasks.length?Math.round(tasks.reduce((s,t)=>s+t.progress,0)/tasks.length):0;
  const items=[
    {l:"總體進度",v:avg+"%",c:C.indigo},{l:"完成",v:`${d}/${tasks.length}`,c:C.green},
    {l:"進行中",v:ip,c:C.amber},{l:"自動化",v:autos.filter(a=>a.active).length+" 啟用",c:C.purple},
    {l:"待審核",v:reviews.filter(r=>r.status==="pending").length,c:C.red},
  ];
  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8,marginBottom:20}}>
    {items.map((s,i)=><div key={i} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
      <div style={{fontSize:20,fontWeight:800,color:s.c,letterSpacing:-.5}}>{s.v}</div>
      <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:500}}>{s.l}</div>
    </div>)}
  </div>;
}

export function AutoPanel({autos,onTog,onRun,onView}){
  return <Sec icon="⚡" title="自動化流程" count={autos.filter(a=>a.active).length+" 啟用"}>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {autos.map(a=><Card key={a.id} oc={`AUTO_VIEW_${a.id}`} glow={a.active?C.green:undefined} onClick={()=>onView?.(a)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              {a.active&&<Pulse/>}<span style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{a.name}</span>
            </div>
            <div style={{fontSize:11,color:C.t3,marginBottom:6}}>
              <Badge c={C.cyan} bg={C.cyanG} mono style={{marginRight:6}}>{a.cron}</Badge>
              {a.runs} 次執行 · 上次 {a.lastRun}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {a.chain.map((s,i)=><span key={i} style={{fontSize:10,color:C.t2,background:"rgba(255,255,255,0.03)",padding:"2px 7px",borderRadius:5}}>
                {i>0&&<span style={{color:C.t3,marginRight:2}}>→</span>}{s}</span>)}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0,marginLeft:10}}>
            {onRun && <Btn oc={`AUTO_RUN_${a.id}`} sm v="pri" onClick={(e)=>{e.stopPropagation();onRun(a.id);}}>▶ 執行</Btn>}
            <button data-oc-action={`AUTO_TOGGLE_${a.id}`} onClick={(e)=>{e.stopPropagation();onTog(a.id);}} style={{width:40,height:21,borderRadius:11,border:"none",background:a.active?C.green:"rgba(255,255,255,0.07)",position:"relative",cursor:"pointer",transition:"background .2s"}}>
              <span style={{position:"absolute",width:17,height:17,borderRadius:9,background:"#fff",top:2,left:a.active?21:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            </button>
            <span style={{fontSize:9.5,color:a.health>95?C.green:a.health>85?C.amber:C.red}}>● {a.health}%</span>
          </div>
        </div>
      </Card>)}
    </div>
  </Sec>;
}

// ── 審核意見對話欄 ──
function ReviewCommentDialog({ review, onClose, onSubmit, onDirectApprove }) {
  const [comment, setComment] = useState("");
  if (!review) return null;
  return <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",width:"90%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:16}}>💬</span>
        <span style={{fontSize:14,fontWeight:700,color:C.t1,flex:1}}>審核意見</span>
        <span onClick={onClose} style={{fontSize:16,color:C.t3,cursor:"pointer"}}>✕</span>
      </div>
      <div style={{background:C.s1,borderRadius:10,padding:"10px 12px",marginBottom:12,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:4}}>{review.title}</div>
        <div style={{fontSize:11,color:C.t3}}>{review.desc?.slice(0,120)}{review.desc?.length>120?"…":""}</div>
      </div>
      <textarea
        value={comment}
        onChange={e=>setComment(e.target.value)}
        placeholder="輸入您的審核意見或備註…"
        rows={4}
        style={{width:"100%",borderRadius:10,border:`1px solid ${C.border}`,background:C.s1,color:C.t1,fontSize:12,padding:"10px 12px",resize:"vertical",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}
        autoFocus
      />
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
        <Btn sm v="def" onClick={onClose}>取消</Btn>
        <Btn sm v="def" onClick={()=>{onSubmit(review.id, comment, "comment"); onClose();}}>
          💾 儲存意見
        </Btn>
        <Btn sm v="ok" onClick={()=>{onDirectApprove(review.id, comment); onClose();}}>
          ✅ 直接核准
        </Btn>
      </div>
    </div>
  </div>;
}

export function ReviewPanel({reviews,onOk,onNo,onView,onOkAndCreateTask,onArchive,onApproveRiskItems,onComment,onAutoReview}){
  const [commentTarget, setCommentTarget] = useState(null);
  const pending=reviews.filter(r=>r.status==="pending"), approved=reviews.filter(r=>r.status==="approved"), archived=reviews.filter(r=>r.status==="archived");
  const priCfg={critical:{l:"極高",c:C.purple,bg:C.purpleG},high:{l:"高",c:C.red,bg:C.redG},medium:{l:"中",c:C.amber,bg:C.amberG},low:{l:"低",c:"#a3e635",bg:"rgba(163,230,53,0.08)"}};
  const typI={tool:"⚙️",skill:"🧠",issue:"🔧",learn:"📚",proposal:"💡",red_alert:"🚨"};

  // 風險統計
  const riskPending = pending.filter(r => r._riskLevel && r._riskLevel !== "none");
  const riskApproved = approved.filter(r => r._riskLevel && r._riskLevel !== "none");

  // 全部通過處理函數
  const handleApproveAll = () => {
    if (!confirm(`確定要一次通過全部 ${pending.length} 個發想嗎？`)) return;
    pending.forEach(r => onOk?.(r.id));
  };
  
  const approveAllBtn = pending.length > 0 ? (
    <Btn v="ok" sm onClick={handleApproveAll} oc="REVIEW_APPROVE_ALL">
      ✅ 全部通過 ({pending.length})
    </Btn>
  ) : null;
  const riskApproveBtn = riskPending.length > 0 && onApproveRiskItems ? (
    <Btn sm v="warn" onClick={() => onApproveRiskItems("all")} oc="REVIEW_APPROVE_RISK_ALL">
      ⚠️ 風險項一鍵批准 ({riskPending.length})
    </Btn>
  ) : null;
  // 批量 AI 蓋章：低/中風險自動通過轉任務，高風險送老蔡
  const autoReviewBtn = pending.length > 0 && onAutoReview ? (
    <Btn sm v="pri" onClick={async () => {
      if (!confirm(`AI 將自動蓋章審核 ${pending.length} 個項目：\n・低/中風險 → 自動通過+轉任務\n・高/極高風險 → 送老蔡簽核\n\n確定？`)) return;
      for (const r of pending) await onAutoReview(r.id);
    }} oc="REVIEW_AI_STAMP_ALL">
      🔖 AI 批量蓋章 ({pending.length})
    </Btn>
  ) : null;
  const rightEl = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {autoReviewBtn}
      {riskApproveBtn}
      {approveAllBtn}
      <Link to="/review" style={{ fontSize: 11, color: C.indigo, textDecoration: "underline", fontWeight: 500 }}>前往完整審核中心 →</Link>
    </div>
  );
  
  // 處理意見提交
  const handleCommentSubmit = (id, comment, action) => {
    if (onComment) onComment(id, comment, action);
    // 同時更新本地顯示
    // （透過父層 hook 處理 persist）
  };
  const handleDirectApprove = (id, comment) => {
    if (onComment) onComment(id, comment, "approve");
    onOk?.(id);
  };

  return <><Sec icon="🔍" title="審核中心" count={pending.length+" 待審"} right={rightEl}>
    {pending.length===0&&<div style={{textAlign:"center",padding:24,color:C.t3,fontSize:12}}>✓ 全部審核完畢</div>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {pending.map(r=>{const pc=priCfg[r.pri]||priCfg.medium;
        const hasRisk = r._riskLevel && r._riskLevel !== "none";
        const riskStrat = r._riskStrategy;
        return <Card key={r.id} oc={`REVIEW_CARD_${r.id}`} glow={r.pri==="critical"?C.red:hasRisk?RISK_COLORS[r._riskLevel]?.c:undefined}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}}>
              <span style={{fontSize:13}}>{typI[r.type]}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              {hasRisk && <RiskBadge level={r._riskLevel} />}
              <Badge c={pc.c} bg={pc.bg}>{pc.l}</Badge>
            </div>
          </div>
          <p style={{fontSize:12,color:C.t2,margin:"0 0 6px",lineHeight:1.4}}>{r.desc}</p>
          {/* 風險修改策略 */}
          {hasRisk && riskStrat && <div style={{background:r._riskLevel==="high"?C.redG:r._riskLevel==="medium"?"rgba(251,191,36,0.06)":"rgba(52,211,153,0.04)",border:`1px solid ${r._riskLevel==="high"?"rgba(239,68,68,0.15)":r._riskLevel==="medium"?"rgba(251,191,36,0.15)":"rgba(52,211,153,0.1)"}`,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:600,color:r._riskLevel==="high"?C.red:r._riskLevel==="medium"?C.amber:C.green,marginBottom:4}}>{riskStrat.summary}</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {riskStrat.strategies.map((s,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:5,fontSize:10}}>
                <span style={{color:C.t3,flexShrink:0}}>•</span>
                <div><span style={{fontWeight:600,color:C.t1}}>{s.action}</span><span style={{color:C.t3}}> — {s.detail}</span></div>
              </div>)}
            </div>
          </div>}
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            <div data-oc-action={`REVIEW_VIEW_${r.id}`} onClick={()=>onView(r)} style={{flex:1,minWidth:80,background:C.indigoG,borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:11,color:C.t3,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              💭 {r.reasoning}
            </div>
            <Btn sm v="def" onClick={()=>setCommentTarget(r)} style={{whiteSpace:"nowrap"}}>💬 意見</Btn>
            {onAutoReview && <Btn oc={`REVIEW_AI_STAMP_${r.id}`} sm v="pri" onClick={()=>onAutoReview(r.id)} style={{whiteSpace:"nowrap"}}>🔖 AI蓋章</Btn>}
            {onArchive && <Btn oc={`REVIEW_ARCHIVE_${r.id}`} sm v="def" onClick={()=>onArchive(r.id)} style={{whiteSpace:"nowrap"}}>📥 收錄</Btn>}
            <Btn oc={`REVIEW_QUICK_REJECT_${r.id}`} sm v="no" onClick={()=>onNo(r.id)} style={{whiteSpace:"nowrap"}}>✕ 未通過</Btn>
            <Btn oc={`REVIEW_QUICK_APPROVE_${r.id}`} sm v="ok" onClick={()=>onOk(r.id)} style={{whiteSpace:"nowrap"}}>✓ 通過</Btn>
            {onOkAndCreateTask && <Btn oc={`REVIEW_APPROVE_AND_TASK_${r.id}`} sm v="pri" onClick={()=>onOkAndCreateTask(r)} style={{whiteSpace:"nowrap"}}>📋 通過+轉任務</Btn>}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,color:C.t3}}>{r.src} · {r.date}</span>
              {(r.collaborators||[]).length>0&&<div style={{display:"flex",marginLeft:4}}>
                {(r.collaborators||[]).slice(0,3).map((c,i)=><span key={i} title={c.name||c} style={{width:16,height:16,borderRadius:"50%",background:`hsl(${(c.name||c).charCodeAt(0)*37%360},55%,42%)`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:700,border:"1px solid #06060a",marginLeft:i>0?-5:0}}>{(c.name||c).charAt(0)}</span>)}
              </div>}
            </div>
            <span style={{fontSize:10,color:C.t3,cursor:"pointer",textDecoration:"underline"}} onClick={()=>onView(r)}>查看詳情 →</span>
          </div>
        </Card>;})}
    </div>
    {approved.length>0&&<div style={{marginTop:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{fontSize:10,fontWeight:650,color:C.green}}>✅ 已批准 ({approved.length})</div>
        {riskApproved.length>0&&<div style={{fontSize:10,color:C.amber,fontWeight:600}}>⚠️ {riskApproved.length} 項有風險</div>}
      </div>
      {approved.map(r=>{
        const pct = r.progress ?? 50;
        const collabs = r.collaborators || [];
        const hasRisk = r._riskLevel && r._riskLevel !== "none";
        const riskColor = hasRisk ? (RISK_COLORS[r._riskLevel]||RISK_COLORS.low) : null;
        const hasComment = r._reviewComment;
        return <div key={r.id} style={{background:hasRisk?riskColor.bg:C.greenG,border:`1px solid ${hasRisk?riskColor.c+"20":"rgba(52,211,153,0.08)"}`,borderRadius:10,padding:"10px 12px",marginBottom:6,transition:"all .15s"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
            {/* 風險蓋章 */}
            {hasRisk && <RiskStamp level={r._riskLevel} />}
            <span style={{fontSize:12}}>{typI[r.type]}</span>
            {/* 已批核的標題用綠色 */}
            <span style={{flex:1,fontSize:12,fontWeight:600,color:C.green,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
            {hasRisk && <RiskBadge level={r._riskLevel} />}
            <span style={{fontSize:11,fontWeight:700,color:pct===100?C.green:C.amber,flexShrink:0}}>{pct}%</span>
          </div>
          {/* 審核意見（如有） */}
          {hasComment && <div style={{fontSize:10,color:C.indigo,marginBottom:4,padding:"4px 8px",background:C.indigoG,borderRadius:6,borderLeft:`2px solid ${C.indigo}`}}>
            💬 {r._reviewComment}
          </div>}
          {/* 風險修改策略摘要 */}
          {hasRisk && r._riskStrategy && <div style={{fontSize:10,color:riskColor.c,marginBottom:4,padding:"3px 6px",background:riskColor.bg,borderRadius:4}}>
            {r._riskStrategy.summary}
          </div>}
          {/* 迷你進度條 */}
          <div style={{height:3,background:"rgba(255,255,255,0.04)",borderRadius:2,overflow:"hidden",marginBottom:4}}>
            <div style={{height:"100%",width:`${pct}%`,background:pct===100?C.green:pct>50?C.amber:C.indigo,borderRadius:2,transition:"width .3s"}}/>
          </div>
          {/* 協作者 */}
          {collabs.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
            <div style={{display:"flex",marginRight:2}}>
              {collabs.slice(0,4).map((c,i)=><span key={i} title={`${c.name||c} ${c.role?`(${c.role})`:""}`} style={{width:18,height:18,borderRadius:"50%",background:`hsl(${(c.name||c).charCodeAt(0)*37%360},55%,42%)`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,border:"1.5px solid #06060a",marginLeft:i>0?-6:0,zIndex:collabs.length-i}}>{(c.name||c).charAt(0)}</span>)}
            </div>
            <span style={{fontSize:9,color:C.t3}}>{collabs.map(c=>c.name||c).join("、")}</span>
          </div>}
          {/* 操作按鈕列 */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <Btn sm v="def" onClick={()=>onView?.(r)} style={{fontSize:10}}>🔍 查看詳情</Btn>
            <Btn sm v="def" onClick={()=>setCommentTarget(r)} style={{fontSize:10}}>💬 補充意見</Btn>
            {onOkAndCreateTask && <Btn sm v="pri" onClick={()=>onOkAndCreateTask(r)} style={{fontSize:10}}>📋 轉任務</Btn>}
            {onArchive && <Btn sm v="def" onClick={()=>onArchive(r.id)} style={{fontSize:10}}>📥 歸檔</Btn>}
            <span style={{flex:1}}/>
            <span style={{fontSize:9,color:C.green,fontWeight:600}}>✅ 已簽核</span>
          </div>
        </div>;
      })}
    </div>}
    {archived.length>0&&<div style={{marginTop:12}}>
      <div style={{fontSize:10,fontWeight:650,color:C.t3,marginBottom:6}}>📥 收錄（{archived.length}）</div>
      {archived.map(r=><div key={r.id} onClick={()=>onView?.(r)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",background:C.s1,border:`1px solid rgba(148,163,184,0.08)`,borderRadius:8,fontSize:12,color:C.t2,marginBottom:4,cursor:"pointer",transition:"all .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background=C.s2} onMouseLeave={e=>e.currentTarget.style.background=C.s1}>
        <span>{typI[r.type]}</span><span style={{flex:1,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
        {onArchive && <span style={{fontSize:10,color:C.indigo,cursor:"pointer",textDecoration:"underline",whiteSpace:"nowrap"}} onClick={(e)=>{e.stopPropagation();onArchive(r.id,'unarchive');}}>拉回待審</span>}
        <Badge c={C.t3} bg={C.s1}>收錄中</Badge>
      </div>)}
    </div>}
  </Sec>
  {/* 審核意見對話欄 */}
  <ReviewCommentDialog
    review={commentTarget}
    onClose={()=>setCommentTarget(null)}
    onSubmit={handleCommentSubmit}
    onDirectApprove={handleDirectApprove}
  />
  </>;
}

const DONE_COL_MAX_HEIGHT = 320; // 完成欄最大高度，避免版面被拉長

function CompactTaskCard({t,cc,onView,onProg,onRun,onDelete,onMove,canDrag,onDragStart}){
  const [open,setOpen]=useState(false);
  const doneSubs=(t.subs||[]).filter(s=>s.d).length, totalSubs=(t.subs||[]).length;
  return <div
    data-oc-action={`TASK_CARD_${t.id}`}
    draggable={canDrag}
    onDragStart={onDragStart}
    style={{background:open?C.s3:C.s2,border:`1px solid ${C.border}`,borderRadius:8,cursor:canDrag?"grab":"pointer",transition:"all .15s",overflow:"hidden"}}
  >
    {/* 緊湊行：色點 + 標題優先 + 尾部指標 */}
    <div onClick={()=>setOpen(p=>!p)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",minHeight:0}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:cc.c,flexShrink:0}} title={cc.l}/>
      {t.riskLevel && t.riskLevel !== "low" && <span style={{width:7,height:7,borderRadius:"50%",background:(RISK_COLORS[t.riskLevel]||RISK_COLORS.low).c,flexShrink:0,border:"1px solid rgba(0,0,0,0.3)"}} title={(RISK_COLORS[t.riskLevel]||RISK_COLORS.low).label}/>}
      <span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title??t.name}</span>
      {t.auto && <span style={{fontSize:8,color:C.indigo,flexShrink:0}}>⚡</span>}
      {totalSubs>0&&<span style={{fontSize:8,color:C.t3,whiteSpace:"nowrap",flexShrink:0}}>{doneSubs}/{totalSubs}</span>}
      {t.status!=="done"&&t.progress>0?<span style={{fontSize:8,color:C.t2,whiteSpace:"nowrap",flexShrink:0}}>{t.progress}%</span>:null}
      {t.status==="done"&&<span style={{fontSize:9,flexShrink:0}}>✅</span>}
      <span style={{fontSize:8,color:C.t3,transition:"transform .15s",transform:open?"rotate(180deg)":"rotate(0)",flexShrink:0}}>▾</span>
    </div>
    {/* 展開區塊 */}
    {open && <div style={{padding:"4px 10px 8px",borderTop:`1px solid ${C.border}`,animation:"oc-su .12s ease"}}>
      {(t.subs||[]).length>0&&<div style={{display:"flex",flexDirection:"column",gap:1,marginBottom:5}}>
        {(t.subs||[]).map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
          <span style={{width:11,height:11,borderRadius:2,border:s.d?"none":`1.5px solid ${C.t3}`,background:s.d?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,color:"#fff",flexShrink:0}}>{s.d&&"✓"}</span>
          <span style={{color:s.d?C.t3:C.t2,textDecoration:s.d?"line-through":"none"}}>{s.t}</span>
        </div>)}
      </div>}
      {t.thought&&<div data-oc-action={`TASK_VIEW_${t.id}`} onClick={(e)=>{e.stopPropagation();onView(t);}} style={{background:"rgba(99,102,241,0.03)",borderRadius:5,padding:"4px 7px",marginBottom:5,cursor:"pointer",fontSize:10,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💭 {t.thought}</div>}
      <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
        {t.status==="queued" && onRun && <Btn oc={`TASK_RUN_${t.id}`} sm v="pri" onClick={()=>onRun(t.id)} style={{fontSize:10,padding:"2px 8px"}}>▶ 執行</Btn>}
        {t.status==="in_progress" && t.auto && <Btn oc={`TASK_PROGRESS_${t.id}`} sm v="pri" onClick={()=>onProg(t.id)} style={{fontSize:10,padding:"2px 8px"}}>▶ 推進</Btn>}
        {onMove && t.status!=="queued" && <Btn sm v="gh" onClick={()=>onMove(t.id,"queued")} style={{fontSize:9,color:C.t3,padding:"2px 6px"}}>↩ 排隊</Btn>}
        {onMove && t.status!=="in_progress" && <Btn sm v="gh" onClick={()=>onMove(t.id,"in_progress")} style={{fontSize:9,color:C.t3,padding:"2px 6px"}}>⏱ 進行中</Btn>}
        {onMove && t.status!=="done" && <Btn sm v="gh" onClick={()=>onMove(t.id,"done")} style={{fontSize:9,color:C.t3,padding:"2px 6px"}}>✅ 完成</Btn>}
        <span style={{flex:1}}/>
        <span data-oc-action={`TASK_VIEW_${t.id}`} onClick={()=>onView(t)} style={{fontSize:9,color:C.indigo,cursor:"pointer",textDecoration:"underline"}}>詳情</span>
        {onDelete && <Btn oc={`TASK_DELETE_${t.id}`} sm v="gh" onClick={()=>onDelete(t.id)} style={{color:C.t3,fontSize:9,padding:"2px 6px"}}>🗑</Btn>}
      </div>
    </div>}
  </div>;
}

const STATUS_CFG={queued:{l:"排隊",i:"📋",c:C.t3},in_progress:{l:"進行",i:"🔄",c:C.indigo},done:{l:"完成",i:"✅",c:C.green}};
const LS_VIEW_KEY = "openclaw_taskboard_view";

export function TaskBoard({tasks,onProg,onView,onRun,onDelete,onMove,onAddQuiz,bare=false}){
  const [hideDone, setHideDone] = useState(true);
  const [viewMode, setViewMode] = useState(() => { try { return localStorage.getItem(LS_VIEW_KEY) || "grid"; } catch { return "grid"; } });
  const catC={bugfix:{l:"修復",c:C.red},learn:{l:"學習",c:C.purple},feature:{l:"功能",c:C.indigo},improve:{l:"改進",c:C.green}};
  const resolveCat = (cat) => catC[cat] ?? { l: cat || "其他", c: C.t3 };

  const setView = (v) => { setViewMode(v); try { localStorage.setItem(LS_VIEW_KEY, v); } catch {} };

  const filtered = hideDone ? tasks.filter(t => t.status !== "done") : tasks;

  // === 網格視圖：auto-fill 多欄，每張卡片最小 200px ===
  const gridView = <div className="oc-task-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(200px,100%),1fr))",gap:4}}>
    {filtered.map(t=><CompactTaskCard
      key={t.id} t={t} cc={resolveCat(t.cat)}
      onView={onView} onProg={onProg} onRun={onRun} onDelete={onDelete} onMove={onMove}
      canDrag={false}
    />)}
    {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:16,textAlign:"center",color:C.t3,fontSize:11}}>目前沒有任務</div>}
  </div>;

  // === 列表視圖：單欄極緊湊 ===
  const listView = <div style={{display:"flex",flexDirection:"column",gap:2}}>
    {filtered.map(t=>{
      const cc=resolveCat(t.cat);
      const sc=STATUS_CFG[t.status]||STATUS_CFG.queued;
      return <div key={t.id} onClick={()=>onView(t)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:5,cursor:"pointer",transition:"background .1s"}}
        onMouseEnter={e=>e.currentTarget.style.background=C.s3} onMouseLeave={e=>e.currentTarget.style.background=C.s2}
      >
        <span style={{width:5,height:5,borderRadius:"50%",background:sc.c,flexShrink:0}}/>
        <span style={{width:5,height:5,borderRadius:"50%",background:cc.c,flexShrink:0}} title={cc.l}/>
        <span style={{fontSize:10.5,fontWeight:600,color:C.t1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title??t.name}</span>
        {t.progress>0&&t.status!=="done"&&<span style={{fontSize:8,color:C.t3,flexShrink:0}}>{t.progress}%</span>}
      </div>;
    })}
    {filtered.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:11}}>目前沒有任務</div>}
  </div>;

  // === Kanban 視圖：傳統三欄（保留拖拉） ===
  const [dragOverCol, setDragOverCol] = useState(null);
  const handleDragStart = (e, taskId) => { e.dataTransfer.setData(DRAG_TYPE, taskId); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", taskId); };
  const handleDragOver = (e, colKey) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(colKey); };
  const handleDragLeave = () => setDragOverCol(null);
  const handleDrop = (e, colKey) => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData(DRAG_TYPE) || e.dataTransfer.getData("text/plain"); if (id && onMove) onMove(id, colKey); };
  const kanbanCols=[{k:"queued",l:"排隊中",i:"📋",c:C.t3},{k:"in_progress",l:"進行中",i:"🔄",c:C.indigo},{k:"done",l:"完成",i:"✅",c:C.green}];
  const displayKanbanCols = hideDone ? kanbanCols.filter(c=>c.k!=="done") : kanbanCols;
  const kanbanView = <div className="oc-task-cols" style={{display:"grid",gridTemplateColumns:`repeat(${displayKanbanCols.length},minmax(220px,1fr))`,gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",minWidth:0}}>
    {displayKanbanCols.map(col=>{const ct=tasks.filter(t=>t.status===col.k);
      const isDropTarget = dragOverCol === col.k;
      return <div key={col.k} onDragOver={e=>handleDragOver(e,col.k)} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,col.k)}
        style={{borderRadius:10,minHeight:60,transition:"background .15s",background:isDropTarget?`${col.c}18`:"transparent",border:isDropTarget?`2px dashed ${col.c}`:"2px solid transparent"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,padding:"4px 8px",background:"rgba(255,255,255,0.02)",borderRadius:6,borderBottom:`2px solid ${col.c}`}}>
          <span style={{fontSize:10}}>{col.i}</span><span style={{fontSize:10,fontWeight:600,color:col.c}}>{col.l}</span>
          <span style={{marginLeft:"auto",fontSize:9,color:C.t3}}>{ct.length}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:3,minHeight:30,...(col.k==="done"?{maxHeight:DONE_COL_MAX_HEIGHT,overflowY:"auto"}:{})}}>
          {ct.map(t=><CompactTaskCard key={t.id} t={t} cc={resolveCat(t.cat)} onView={onView} onProg={onProg} onRun={onRun} onDelete={onDelete} onMove={onMove} canDrag={!!onMove} onDragStart={e=>onMove&&handleDragStart(e,t.id)} />)}
          {ct.length===0&&<div style={{padding:8,textAlign:"center",color:C.t3,fontSize:9,border:`1px dashed ${C.border}`,borderRadius:6}}>空</div>}
        </div>
      </div>;})}
  </div>;

  const content = viewMode === "list" ? listView : viewMode === "kanban" ? kanbanView : gridView;

  if (bare) return content;

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const viewBtns = [
    {k:"grid",l:"網格",i:"▦"},{k:"list",l:"列表",i:"☰"},{k:"kanban",l:"看板",i:"▥"}
  ];
  const rightEl = <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
    <div style={{display:"flex",gap:1,background:C.s1,borderRadius:6,padding:1}}>
      {viewBtns.map(v=><button key={v.k} onClick={()=>setView(v.k)} style={{padding:"2px 8px",borderRadius:5,border:"none",background:viewMode===v.k?"rgba(255,255,255,0.08)":"transparent",color:viewMode===v.k?C.t1:C.t3,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}} title={v.l}>{v.i}</button>)}
    </div>
    {onAddQuiz && <Btn sm v="pri" onClick={onAddQuiz} style={{fontSize:10,padding:"2px 8px"}}>➕ 測驗單</Btn>}
    <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:10,color:C.t3}}>
      <input type="checkbox" checked={hideDone} onChange={(e)=>setHideDone(e.target.checked)} style={{accentColor:C.green,width:12,height:12}} />
      隱藏完成{doneCount > 0 && ` (${doneCount})`}
    </label>
  </div>;

  return <Sec icon="📊" title="任務看板" count={tasks.length} right={rightEl}>{content}</Sec>;
}

export function N8nPanel({ flows }){
  const stC={active:C.green,draft:C.t3};
  const list = flows && flows.length ? flows : FALLBACK_N8N;
  return <Sec icon="🔗" title="n8n 工作流" count={list.length} right={<Badge c={C.amber} bg={C.amberG}>Token 節省模式</Badge>}>
    <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:650,color:C.amber,marginBottom:6}}>💡 Token 節省架構</div>
      <div style={{fontSize:11.5,color:C.t2,lineHeight:1.6}}>
        n8n 負責排程觸發、資料路由、Webhook 接收<br/>
        OpenClaw (LLM) 僅在需要推理時被呼叫<br/>
        結構化指令 (JSON) 傳輸，非自然語言 → <span style={{color:C.green}}>節省 ~70% Token</span>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {list.map(f=><Card key={f.id} glow={f.status==="active"?C.green:undefined}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            {f.status==="active"&&<Pulse s={5}/>}
            <span style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{f.name}</span>
          </div>
          <Badge c={stC[f.status]} bg={stC[f.status]+"15"}>{f.status}</Badge>
        </div>
        <div style={{fontSize:11,color:C.t2,marginBottom:5,lineHeight:1.4}}>{f.desc}</div>
        <div style={{display:"flex",gap:8,fontSize:10,color:C.t3}}>
          <span>觸發：<span style={{color:C.cyan}}>{f.trigger}</span></span>
          <span>{f.nodes} 節點</span>
          <span>{f.execs} 次執行</span>
          <span>最後：{f.lastExec}</span>
        </div>
      </Card>)}
    </div>
    <div style={{marginTop:10,padding:12,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10}}>
      <div style={{fontSize:11,fontWeight:650,color:C.cyan,marginBottom:6}}>📡 Telegram 指令列表</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.t2,lineHeight:1.7}}>
        <div><span style={{color:C.green}}>/status</span> — 查看系統狀態與任務進度</div>
        <div><span style={{color:C.green}}>/approve</span> [id] — 批准審核項目</div>
        <div><span style={{color:C.green}}>/reject</span> [id] — 駁回審核項目</div>
        <div><span style={{color:C.green}}>/run</span> [automation] — 手動觸發自動化</div>
        <div><span style={{color:C.green}}>/logs</span> — 查看最近進化紀錄</div>
      </div>
    </div>
  </Sec>;
}

export function ApiPanel({ endpoints }){
  const mC={GET:C.green,POST:C.amber,PATCH:C.indigo,DELETE:C.red};
  const list = endpoints && endpoints.length ? endpoints : FALLBACK_API;
  return <Sec icon="🔌" title="API 端點" count={list.length} right={<Badge c={C.cyan} bg={C.cyanG}>REST + Webhook · 儲存於 Supabase</Badge>}>
    <div style={{fontSize:11,color:C.t2,marginBottom:12,lineHeight:1.5}}>
      <strong style={{color:C.t1}}>API 名稱</strong> · <strong style={{color:C.t1}}>驗證方式</strong>（誰能呼叫）· <strong style={{color:C.t1}}>儲存位置</strong>（資料寫入哪張表）
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {list.map((e,i)=><Card key={i}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{e.name}</span>
          <Badge c={mC[e.method]} bg={mC[e.method]+"12"} mono>{e.method}</Badge>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:C.cyan}}>{e.path}</span>
          <Badge c={e.status==="live"?C.green:C.amber} bg={e.status==="live"?C.greenG:C.amberG}>{e.status}</Badge>
        </div>
        <div style={{fontSize:11,color:C.t2,marginBottom:4}}>{e.desc}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,fontSize:10.5}}>
          <span><span style={{color:C.t3}}>驗證：</span><span style={{color:C.purple}}>{e.authDesc}</span></span>
          <span><span style={{color:C.t3}}>限流：</span><span>{e.rateLimit}</span></span>
          <span><span style={{color:C.t3}}>儲存：</span><span style={{color:C.green}}>{e.storage}</span></span>
        </div>
      </Card>)}
    </div>
  </Sec>;
}

export function ProtocolPanel(){
  const [sessionId, setSessionId] = useState("sess-dev-1");
  const [fromAgent, setFromAgent] = useState("cursor_agent");
  const [gotoAgent, setGotoAgent] = useState("supervisor");
  const [cmdContent, setCmdContent] = useState("handover check from UI");
  const [interruptReason, setInterruptReason] = useState("需要人工確認");
  const [decision, setDecision] = useState("approve");
  const [feedback, setFeedback] = useState("");
  const [lastInterruptId, setLastInterruptId] = useState("");
  const [session, setSession] = useState(null);
  const [commands, setCommands] = useState([]);
  const [interrupts, setInterrupts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadSession = async (sid) => {
    if (!sid) return;
    setLoading(true);
    try {
      const [s, cs, ints] = await Promise.all([
        fetchSessionState(sid),
        fetchSessionCommands(sid),
        fetchSessionInterrupts(sid),
      ]);
      if (s) setSession(s);
      if (Array.isArray(cs)) setCommands(cs);
      if (Array.isArray(ints)) {
        setInterrupts(ints);
        if (!lastInterruptId && ints.length > 0) {
          setLastInterruptId(ints[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初次載入預設 session（若後端尚未建立則會看到空的 SharedState）
    loadSession(sessionId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = async () => {
    try {
      const body = {
        sessionId,
        from: fromAgent,
        command: {
          update: {
            messages: [
              {
                role: "cursor",
                agent: fromAgent,
                content: cmdContent || "handover check",
              },
            ],
          },
          goto: gotoAgent || "supervisor",
        },
      };
      const r = await fetch(apiUrl("/api/openclaw/command"), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      setStatusMsg(`Command: ${r.status} ${data?.ok ? "ok" : "fail"}`);
      await loadSession(sessionId);
    } catch (e) {
      setStatusMsg(`Command error: ${String(e)}`);
    }
  };

  const handleInterrupt = async () => {
    try {
      const body = {
        sessionId,
        from: fromAgent,
        reason: interruptReason || "需要人工確認",
        options: ["approve", "reject", "modify"],
        timeoutMinutes: 30,
      };
      const r = await fetch(apiUrl("/api/openclaw/interrupt"), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (data?.interruptId) setLastInterruptId(data.interruptId);
      setStatusMsg(`Interrupt: ${r.status} ${data?.ok ? "ok" : "fail"}`);
      await loadSession(sessionId);
    } catch (e) {
      setStatusMsg(`Interrupt error: ${String(e)}`);
    }
  };

  const handleResume = async () => {
    try {
      if (!lastInterruptId) {
        setStatusMsg("Resume: 請先建立 interrupt");
        return;
      }
      const body = {
        sessionId,
        interruptId: lastInterruptId,
        decision,
        feedback: feedback || undefined,
      };
      const r = await fetch(apiUrl("/api/openclaw/resume"), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      setStatusMsg(`Resume: ${r.status} ${data?.ok ? "ok" : "fail"}`);
      await loadSession(sessionId);
    } catch (e) {
      setStatusMsg(`Resume error: ${String(e)}`);
    }
  };

  const shared = session?.sharedState || session;
  const exec = shared?.execution;
  const pending = shared?.pendingHuman;

  return <Sec icon="🧠" title="Agent 協作 (Protocol)" count={commands.length} right={loading && <span style={{fontSize:11,color:C.t3}}>載入中...</span>}>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(0,1fr)",gap:12}}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",gap:6}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:C.t3,marginBottom:3}}>Session ID</div>
            <input
              value={sessionId}
              onChange={e=>setSessionId(e.target.value)}
              onBlur={()=>loadSession(sessionId)}
              placeholder="sess-xxx"
              style={{width:"100%",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:11,padding:"6px 8px"}}
            />
          </div>
          <div>
            <div style={{fontSize:10,color:C.t3,marginBottom:3}}>From Agent</div>
            <select
              value={fromAgent}
              onChange={e=>setFromAgent(e.target.value)}
              style={{borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:11,padding:"6px 8px"}}
            >
              <option value="cursor_agent">cursor_agent</option>
              <option value="codex_agent">codex_agent</option>
              <option value="openclaw">openclaw</option>
              <option value="supervisor">supervisor</option>
            </select>
          </div>
        </div>

        <div style={{fontSize:10,color:C.t3,marginTop:4}}>Command（update + goto）</div>
        <textarea
          value={cmdContent}
          onChange={e=>setCmdContent(e.target.value)}
          rows={2}
          placeholder="要寫進 SharedState.messages 的內容"
          style={{width:"100%",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:11,padding:"6px 8px",resize:"vertical"}}
        />
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:C.t3}}>goto</span>
          <input
            value={gotoAgent}
            onChange={e=>setGotoAgent(e.target.value)}
            style={{flex:1,borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:11,padding:"4px 8px"}}
          />
          <Btn sm v="pri" onClick={handleCommand} style={{fontSize:10}}>送 Command</Btn>
        </div>

        <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:10,color:C.t3}}>Interrupt / Resume</div>
          <input
            value={interruptReason}
            onChange={e=>setInterruptReason(e.target.value)}
            placeholder="中斷原因"
            style={{width:"100%",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:11,padding:"6px 8px"}}
          />
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <Btn sm v="pri" onClick={handleInterrupt} style={{fontSize:10}}>送 Interrupt</Btn>
            <span style={{fontSize:10,color:C.t3}}>last interruptId</span>
            <input
              value={lastInterruptId}
              onChange={e=>setLastInterruptId(e.target.value)}
              style={{flex:1,borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:10,padding:"4px 6px"}}
            />
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <select
              value={decision}
              onChange={e=>setDecision(e.target.value)}
              style={{borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:11,padding:"4px 8px"}}
            >
              <option value="approve">approve</option>
              <option value="reject">reject</option>
              <option value="modify">modify</option>
            </select>
            <input
              value={feedback}
              onChange={e=>setFeedback(e.target.value)}
              placeholder="feedback（選填）"
              style={{flex:1,borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.t1,fontSize:10,padding:"4px 6px"}}
            />
            <Btn sm v="pri" onClick={handleResume} style={{fontSize:10}}>Resume</Btn>
          </div>
        </div>

        {statusMsg && <div style={{marginTop:6,fontSize:10,color:C.t3}}>狀態：{statusMsg}</div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{fontSize:11,fontWeight:600,color:C.t1}}>Session 狀態</div>
        {shared
          ? <div style={{fontSize:11,color:C.t2,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:10}}>
              <div>execution.status：<span style={{color:C.indigo,fontWeight:600}}>{exec?.status || "idle"}</span></div>
              <div>currentAgent：<span style={{color:C.t1}}>{exec?.currentAgent || "-"}</span></div>
              {pending && (
                <div style={{marginTop:6,fontSize:11}}>
                  <div style={{color:C.red,fontWeight:600}}>pendingHuman：</div>
                  <div>ID：{pending.interruptId}</div>
                  <div>reason：{pending.reason}</div>
                  <div>deadline：{pending.deadline}</div>
                </div>
              )}
            </div>
          : <div style={{fontSize:11,color:C.t3}}>尚未載入 Session</div>}

        <div style={{fontSize:11,fontWeight:600,color:C.t1,marginTop:4}}>最近 Commands</div>
        <div style={{fontSize:11,color:C.t2,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:10,maxHeight:160,overflowY:"auto"}}>
          {commands.length === 0 && <div style={{fontSize:11,color:C.t3}}>尚無 command 紀錄</div>}
          {commands.slice(0,5).map(c=>(
            <div key={c.id} style={{marginBottom:6}}>
              <div style={{fontSize:10,color:C.t3}}>{c.createdAt} · {c.from}</div>
              <div style={{fontSize:11,color:C.t1,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                {JSON.stringify(c.command).slice(0,120)}{JSON.stringify(c.command).length>120?"…":""}
              </div>
            </div>
          ))}
        </div>

        <div style={{fontSize:11,fontWeight:600,color:C.t1,marginTop:4}}>最近 Interrupts</div>
        <div style={{fontSize:11,color:C.t2,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:10,maxHeight:140,overflowY:"auto"}}>
          {interrupts.length === 0 && <div style={{fontSize:11,color:C.t3}}>尚無 interrupt 紀錄</div>}
          {interrupts.slice(0,5).map(i=>(
            <div key={i.id} style={{marginBottom:6}}>
              <div style={{fontSize:10,color:C.t3}}>{i.createdAt || "-"} · {i.from}</div>
              <div>reason：{i.reason}</div>
              <div>decision：{i.decision || "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Sec>;
}

export function SecurityPanel({ layers, rbacMatrix }){
  const secList = layers && layers.length ? layers : FALLBACK_SECURITY;
  const rbacList = rbacMatrix && rbacMatrix.length ? rbacMatrix : FALLBACK_RBAC;
  return <Sec icon="🛡️" title="安全防護" count={secList.length+" 層"} right={<Badge c={C.green} bg={C.greenG}>全層啟用</Badge>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(260px,100%),1fr))",gap:6,marginBottom:14}}>
      {secList.map(s=><Card key={s.id} glow={C.green}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:3}}>{s.name}</div>
            <div style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{s.detail}</div>
          </div>
        </div>
      </Card>)}
    </div>
    <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <div style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",fontSize:10,fontWeight:650,color:C.t3,letterSpacing:.3}}>
        RBAC 權限矩陣
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",padding:"6px 12px",background:"rgba(192,132,252,0.03)",fontSize:10,fontWeight:650,color:C.purple,letterSpacing:.3,borderTop:`1px solid ${C.border}`}}>
        <span>資源</span><span>admin</span><span>user</span><span>agent</span>
      </div>
      {rbacList.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",padding:"6px 12px",fontSize:11,alignItems:"center",borderTop:`1px solid ${C.border}`,background:i%2===0?"rgba(255,255,255,0.01)":"transparent"}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.t1,fontSize:10.5}}>{r.resource}</span>
        <span style={{color:C.green,fontWeight:600,fontSize:10}}>{r.admin}</span>
        <span style={{color:C.amber,fontSize:10}}>{r.user}</span>
        <span style={{color:C.indigo,fontSize:10}}>{r.agent}</span>
      </div>)}
    </div>
  </Sec>;
}

export function PluginPanel({ plugins }){
  const stC={active:C.green,inactive:C.t3,template:C.amber};
  const list = plugins && plugins.length ? plugins : FALLBACK_PLUGINS;
  return <Sec icon="🧩" title="Plugin 市集" count={list.length} right={<Badge c={C.amber} bg={C.amberG}>可擴充架構</Badge>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(260px,100%),1fr))",gap:6}}>
      {list.map(p=><Card key={p.id} glow={p.status==="active"?C.green:p.status==="template"?C.amber:undefined} style={p.status==="template"?{borderStyle:"dashed"}:{}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:20,flexShrink:0}}>{p.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <span style={{fontSize:12,fontWeight:600,color:C.t1}}>{p.name}</span>
              <Badge c={stC[p.status]} bg={stC[p.status]+"15"}>{p.status}</Badge>
            </div>
            <div style={{fontSize:11,color:C.t2,marginBottom:4}}>{p.desc}</div>
            {p.calls>0&&<div style={{fontSize:10,color:C.t3}}>{p.calls.toLocaleString()} 次呼叫</div>}
          </div>
        </div>
      </Card>)}
    </div>
    <div style={{marginTop:10,padding:12,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10}}>
      <div style={{fontSize:11,fontWeight:650,color:C.amber,marginBottom:6}}>🔄 擴充方式</div>
      <div style={{fontSize:11,color:C.t2,lineHeight:1.6}}>
        1. 透過 <span style={{color:C.cyan}}>POST /api/plugins/register</span> 註冊新 Plugin<br/>
        2. Plugin 定義：name / trigger / webhook_url / auth_type<br/>
        3. n8n 自動建立對應工作流並接入 OpenClaw 管線<br/>
        4. 所有 Plugin 操作記錄至 audit_logs
      </div>
    </div>
  </Sec>;
}

const TAG_ICON={"批准":"✅","批准+轉任務":"📋","駁回":"❌","收錄":"📥","推進":"▶","完成":"🏆","執行":"🚀","自動化":"⚡","狀態變更":"🔄","刪除":"🗑","學習":"📚","構想":"💡","拉回待審":"↩"};
const MILESTONE_TAGS=new Set(["完成","批准+轉任務","構想"]);

function evoDateLabel(isoStr) {
  if (!isoStr) return "未知";
  const d = new Date(isoStr);
  if (isNaN(d)) return "未知";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff === 2) return "前天";
  if (diff <= 7) return `${diff} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function groupEvoByDate(log) {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;
  for (const e of log) {
    const dateStr = evoDateLabel(e.created_at);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      currentGroup = { date: dateStr, events: [] };
      groups.push(currentGroup);
    }
    currentGroup.events.push(e);
  }
  return groups;
}

export function EvoPanel({log}){
  const [expandAll, setExpandAll] = useState(false);
  const groups = groupEvoByDate(log);
  const milestones = log.filter(e => MILESTONE_TAGS.has(e.tag));
  const stats = {};
  for (const e of log) { const t = e.tag || "其他"; stats[t] = (stats[t] || 0) + 1; }

  return <Sec icon="🧬" title="進化歷史碑" count={log.length} right={
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <button onClick={()=>setExpandAll(p=>!p)} style={{fontSize:10,color:C.t3,background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:"inherit"}}>{expandAll?"收合全部":"展開全部"}</button>
    </div>
  }>
    {/* 里程碑摘要條 */}
    {milestones.length>0&&<div style={{marginBottom:14,padding:"10px 12px",background:`linear-gradient(135deg,${C.indigoG},${C.purpleG})`,border:`1px solid ${C.indigo}20`,borderRadius:10}}>
      <div style={{fontSize:10,fontWeight:650,color:C.indigo,marginBottom:6}}>🏛 里程碑</div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {milestones.slice(0,5).map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:12}}>{TAG_ICON[e.tag]||"🔹"}</span>
          <span style={{fontSize:11,color:C.t1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.x}</span>
          <span style={{fontSize:9,color:C.t3,whiteSpace:"nowrap"}}>{e.t}</span>
        </div>)}
        {milestones.length>5&&<div style={{fontSize:9,color:C.t3,textAlign:"center"}}>⋯ 共 {milestones.length} 個里程碑</div>}
      </div>
    </div>}

    {/* 活動統計條 */}
    <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
      {Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([tag,cnt])=>
        <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,fontSize:9,color:C.t2}}>
          <span>{TAG_ICON[tag]||"•"}</span>{tag}<span style={{fontWeight:700,color:C.t1}}>{cnt}</span>
        </span>
      )}
    </div>

    {/* 時間線主體（按日期分組） */}
    <div style={{position:"relative",paddingLeft:18}}>
      <div style={{position:"absolute",left:5,top:0,bottom:0,width:2,background:`linear-gradient(to bottom,${C.indigo},${C.purple}40,${C.green}20)`,borderRadius:1}}/>
      {groups.map((g,gi)=><EvoDateGroup key={gi} group={g} defaultOpen={expandAll||gi===0} />)}
    </div>
  </Sec>;
}

function EvoDateGroup({group,defaultOpen}){
  const [open,setOpen]=useState(defaultOpen);
  useEffect(()=>{setOpen(defaultOpen);},[defaultOpen]);
  const hasMilestone=group.events.some(e=>MILESTONE_TAGS.has(e.tag));
  return <div style={{marginBottom:8}}>
    {/* 日期標頭 */}
    <div onClick={()=>setOpen(p=>!p)} style={{position:"relative",display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginBottom:open?6:0,marginLeft:-18,paddingLeft:18}}>
      <div style={{position:"absolute",left:1,width:10,height:10,borderRadius:5,background:hasMilestone?C.indigo:C.s3,border:`2px solid ${hasMilestone?C.indigo:C.t3}`}}/>
      <span style={{fontSize:10,fontWeight:700,color:hasMilestone?C.indigo:C.t2}}>{group.date}</span>
      <span style={{fontSize:9,color:C.t3}}>({group.events.length})</span>
      <span style={{fontSize:8,color:C.t3,transition:"transform .15s",transform:open?"rotate(0)":"rotate(-90deg)"}}>▼</span>
    </div>
    {/* 事件列表 */}
    {open&&<div style={{display:"flex",flexDirection:"column",gap:2,animation:"oc-su .12s ease"}}>
      {group.events.map((e,i)=>{
        const isMilestone=MILESTONE_TAGS.has(e.tag);
        return <div key={i} style={{position:"relative",marginLeft:-2,paddingLeft:8,display:"flex",alignItems:"flex-start",gap:6,...(isMilestone?{background:`${e.c}08`,borderRadius:6,padding:"4px 8px 4px 8px",marginRight:4}:{})}}>
          <div style={{position:"absolute",left:-11,top:6,width:5,height:5,borderRadius:3,background:e.c,flexShrink:0}}/>
          <span style={{fontSize:13,flexShrink:0,lineHeight:1}}>{TAG_ICON[e.tag]||"•"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:isMilestone?C.t1:C.t2,fontWeight:isMilestone?600:400,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.x}</div>
          </div>
          <span style={{fontSize:8,color:C.t3,whiteSpace:"nowrap",flexShrink:0,lineHeight:1.8}}>{e.t}</span>
        </div>;
      })}
    </div>}
  </div>;
}

// ==================== 🟣 派工審核面板 ====================

const STATUS_EMOJI = { pending_review: "⏳", approved: "✅", rejected: "❌", completed: "✅", failed: "💥" };

export function DispatchReviewPanel() {
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const poll = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/openclaw/dispatch/status"), {
        headers: apiHeaders(false),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (data.ok) setDispatchStatus(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    poll().finally(() => setLoading(false));
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [poll]);

  const handleReview = async (taskId, decision) => {
    setActionLoading(prev => ({ ...prev, [taskId]: decision }));
    try {
      const r = await fetch(apiUrl(`/api/openclaw/dispatch/review/${taskId}`), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ decision }),
      });
      if (r.ok) await poll();
    } catch (e) {
      console.warn("[Dispatch] review failed", e);
    }
    setActionLoading(prev => ({ ...prev, [taskId]: null }));
  };

  const handleApproveAll = async () => {
    if (!dispatchStatus?.pendingReviews?.length) return;
    if (!confirm(`確定要批准全部 ${dispatchStatus.pendingReviews.length} 個待審任務嗎？`)) return;
    for (const r of dispatchStatus.pendingReviews) {
      await handleReview(r.taskId, "approved");
    }
  };

  if (loading && !dispatchStatus) {
    return <Sec icon="🟣" title="派工審核" count="載入中…">
      <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 12 }}>載入中…</div>
    </Sec>;
  }

  const pending = dispatchStatus?.pendingReviews || [];
  const recent = dispatchStatus?.recentExecutions || [];
  const isOn = dispatchStatus?.dispatchMode;

  const approveAllBtn = pending.length > 1 ? (
    <Btn v="ok" sm onClick={handleApproveAll} oc="DISPATCH_APPROVE_ALL">
      ✅ 全部批准 ({pending.length})
    </Btn>
  ) : null;

  const rightEl = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {approveAllBtn}
      <Badge c={isOn ? C.purple : C.t3} bg={isOn ? C.purpleG : "rgba(255,255,255,0.03)"}>
        {isOn ? "派工開啟" : "派工關閉"}
      </Badge>
    </div>
  );

  return <>
    <Sec icon="🟣" title="派工審核" count={pending.length + " 待審"} right={rightEl}>
      {!isOn && <Card style={{ textAlign: "center", padding: "20px 16px", borderColor: C.purple + "25" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🟣</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, marginBottom: 4 }}>自動派工模式未開啟</div>
        <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, maxWidth: 360, margin: "0 auto" }}>
          開啟後，Claude 會依照風險等級自動處理任務。<br />
          紫燈（critical）任務會暫停並等待老蔡審核。
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: C.t3 }}>
          請在頂部列點擊「派工關閉」按鈕開啟
        </div>
      </Card>}

      {isOn && pending.length === 0 && (
        <div style={{ textAlign: "center", padding: 24, color: C.t3, fontSize: 12 }}>
          ✓ 沒有待審核的紫燈任務
        </div>
      )}

      {pending.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pending.map(r => {
          const riskCfg = RISK_COLORS[r.riskLevel] || RISK_COLORS.critical;
          const isActioning = actionLoading[r.taskId];
          return <Card key={r.taskId} glow={C.purple} oc={`DISPATCH_REVIEW_${r.taskId}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15 }}>🟣</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.taskName}</span>
              </div>
              <RiskBadge level={r.riskLevel} />
            </div>
            <div style={{ fontSize: 11, color: C.t2, marginBottom: 8, lineHeight: 1.5 }}>
              <span style={{ color: C.t3 }}>原因：</span>{r.reason}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 10, color: C.t3, fontFamily: "'JetBrains Mono',monospace" }}>
                {r.taskId.slice(0, 12)}… · {new Date(r.queuedAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn sm v="no" oc={`DISPATCH_REJECT_${r.taskId}`} dis={!!isActioning} onClick={() => handleReview(r.taskId, "rejected")}>
                  {isActioning === "rejected" ? "拒絕中…" : "✕ 拒絕"}
                </Btn>
                <Btn sm v="ok" oc={`DISPATCH_APPROVE_${r.taskId}`} dis={!!isActioning} onClick={() => handleReview(r.taskId, "approved")}>
                  {isActioning === "approved" ? "批准中…" : "✓ 批准執行"}
                </Btn>
              </div>
            </div>
          </Card>;
        })}
      </div>}
    </Sec>

    {recent.length > 0 && <Sec icon="📋" title="派工執行紀錄" count={recent.length}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[...recent].reverse().slice(0, 20).map((ex, i) => {
          const riskCfg = RISK_COLORS[ex.riskLevel] || RISK_COLORS.low;
          return <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <span style={{ fontSize: 12 }}>{riskCfg.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.taskName}</div>
              <div style={{ fontSize: 10, color: C.t3 }}>
                {ex.agentType || "auto"} · {ex.summary || ex.status}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
              <Badge c={ex.status === "completed" ? C.green : ex.status === "failed" ? C.red : ex.status === "pending_review" ? C.purple : C.amber}
                bg={ex.status === "completed" ? C.greenG : ex.status === "failed" ? C.redG : ex.status === "pending_review" ? C.purpleG : C.amberG}>
                {STATUS_EMOJI[ex.status] || "⚪"} {ex.status === "pending_review" ? "待審" : ex.status === "completed" ? "完成" : ex.status === "failed" ? "失敗" : ex.status}
              </Badge>
              <span style={{ fontSize: 9, color: C.t3 }}>
                {new Date(ex.executedAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>;
        })}
      </div>
    </Sec>}

    {isOn && dispatchStatus && <Sec icon="📊" title="派工摘要">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8 }}>
        {[
          { l: "待審任務", v: dispatchStatus.pendingReviewCount, c: C.purple },
          { l: "已執行", v: dispatchStatus.recentExecutionCount, c: C.green },
          { l: "運行中", v: dispatchStatus.isRunning ? "是" : "否", c: dispatchStatus.isRunning ? C.green : C.t3 },
          { l: "開始時間", v: dispatchStatus.dispatchStartedAt ? new Date(dispatchStatus.dispatchStartedAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-", c: C.t2 },
        ].map((s, i) => <div key={i} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: s.c, letterSpacing: -.5 }}>{s.v}</div>
          <div style={{ fontSize: 10, color: C.t3, marginTop: 2, fontWeight: 500 }}>{s.l}</div>
        </div>)}
      </div>
      {dispatchStatus.lastDigestAt && <div style={{ fontSize: 10, color: C.t3, marginTop: 8, textAlign: "right" }}>
        最後摘要通知：{new Date(dispatchStatus.lastDigestAt).toLocaleString("zh-TW")}
      </div>}
    </Sec>}

    <TelegramNotifySection />
  </>;
}

// ==================== Telegram 通知設定 ====================

function TelegramNotifySection() {
  const [tgStatus, setTgStatus] = useState(null); // null = loading, true/false
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/health"), { headers: apiHeaders(false) });
        if (r.ok) {
          const data = await r.json();
          setTgStatus(!!data.telegram);
        } else {
          setTgStatus(false);
        }
      } catch {
        setTgStatus(false);
      }
    })();
  }, []);

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const r = await fetch(apiUrl("/api/telegram/test"), {
        method: "POST",
        headers: apiHeaders(),
      });
      const data = await r.json();
      setTestResult({ ok: data.ok, msg: data.message || (data.ok ? "已發送" : "發送失敗") });
    } catch (e) {
      setTestResult({ ok: false, msg: "請求失敗：" + String(e) });
    }
    setTestLoading(false);
  };

  return <Sec icon="📬" title="Telegram 通知">
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>Telegram Bot 通知</div>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>紫燈任務 → Telegram 通知老蔡審核</div>
          </div>
        </div>
        <Badge
          c={tgStatus === null ? C.t3 : tgStatus ? C.green : C.red}
          bg={tgStatus === null ? "rgba(255,255,255,0.03)" : tgStatus ? C.greenG : C.redG}
        >
          {tgStatus === null ? "檢測中…" : tgStatus ? "✅ 已設定" : "❌ 未設定"}
        </Badge>
      </div>

      {tgStatus === false && (
        <div style={{ background: C.redG, border: `1px solid rgba(248,113,113,0.12)`, borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize: 11, color: C.red, lineHeight: 1.5 }}>
          Telegram 未設定。請在後端 <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.t1 }}>.env</span> 設定：
          <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.t2, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "8px 10px" }}>
            TELEGRAM_BOT_TOKEN=你的BotToken<br />
            TELEGRAM_CHAT_ID=你的ChatID
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.t3 }}>
            設定完成後重啟後端即可生效。
          </div>
        </div>
      )}

      {tgStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Btn sm v="pri" dis={testLoading} onClick={handleTest}>
            {testLoading ? "發送中…" : "📤 發送測試訊息"}
          </Btn>
          {testResult && (
            <span style={{ fontSize: 11, color: testResult.ok ? C.green : C.red }}>
              {testResult.msg}
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 10, color: C.t3, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: C.t2, marginBottom: 4 }}>通知時機：</div>
        <div>🟣 紫燈任務進入待審佇列時 → 立即通知</div>
        <div>📊 定時摘要（每 30 分鐘）→ 派工期間的執行統計</div>
        <div>✅/❌ 老蔡批准或拒絕後 → 通知執行結果</div>
      </div>
    </Card>
  </Sec>;
}
