import { useState, useEffect } from "react";
import {
  C,
  Pulse,
  Badge,
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

export function ReviewPanel({reviews,onOk,onNo,onView}){
  const pending=reviews.filter(r=>r.status==="pending"), approved=reviews.filter(r=>r.status==="approved");
  const priCfg={critical:{l:"嚴重",c:C.red,bg:C.redG},high:{l:"高",c:C.amber,bg:C.amberG},medium:{l:"中",c:C.green,bg:C.greenG}};
  const typI={tool:"⚙️",skill:"🧠",issue:"🔧",learn:"📚"};
  return <Sec icon="🔍" title="審核中心" count={pending.length+" 待審"}>
    {pending.length===0&&<div style={{textAlign:"center",padding:24,color:C.t3,fontSize:12}}>✓ 全部審核完畢</div>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {pending.map(r=>{const pc=priCfg[r.pri]||priCfg.medium;
        return <Card key={r.id} oc={`REVIEW_CARD_${r.id}`} glow={r.pri==="critical"?C.red:undefined}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}}>
              <span style={{fontSize:13}}>{typI[r.type]}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
            </div>
            <Badge c={pc.c} bg={pc.bg}>{pc.l}</Badge>
          </div>
          <p style={{fontSize:12,color:C.t2,margin:"0 0 6px",lineHeight:1.4}}>{r.desc}</p>
          <div data-oc-action={`REVIEW_VIEW_${r.id}`} onClick={()=>onView(r)} style={{background:C.indigoG,borderRadius:7,padding:"6px 10px",marginBottom:8,cursor:"pointer",fontSize:11,color:C.t3,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            💭 {r.reasoning}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:C.t3}}>{r.src} · {r.date}</span>
            <div style={{display:"flex",gap:5}}>
              <Btn oc={`REVIEW_REJECT_${r.id}`} sm v="no" onClick={()=>onNo(r.id)}>✕</Btn>
              <Btn oc={`REVIEW_APPROVE_${r.id}`} sm v="ok" onClick={()=>onOk(r.id)}>✓ 批准</Btn>
            </div>
          </div>
        </Card>;})}
    </div>
    {approved.length>0&&<div style={{marginTop:12}}>
      <div style={{fontSize:10,fontWeight:650,color:C.t3,marginBottom:6}}>✅ 已批准</div>
      {approved.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",background:C.greenG,border:`1px solid rgba(52,211,153,0.08)`,borderRadius:8,fontSize:12,color:C.t2,marginBottom:4}}>
        <span>{typI[r.type]}</span><span style={{flex:1,color:C.t1}}>{r.title}</span><Badge c={C.green} bg={C.greenG}>已批准</Badge>
      </div>)}
    </div>}
  </Sec>;
}

export function TaskBoard({tasks,onProg,onView,onRun,onDelete,onMove,onAddQuiz}){
  const [dragOverCol, setDragOverCol] = useState(null);
  const cols=[{k:"queued",l:"排隊中",i:"📋",c:C.t3},{k:"in_progress",l:"進行中",i:"🔄",c:C.indigo},{k:"done",l:"完成",i:"✅",c:C.green}];
  const catC={bugfix:{l:"修復",c:C.red},learn:{l:"學習",c:C.purple},feature:{l:"功能",c:C.indigo},improve:{l:"改進",c:C.green}};
  const resolveCat = (cat) => catC[cat] ?? { l: cat || "其他", c: C.t3 };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData(DRAG_TYPE, taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };
  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colKey);
  };
  const handleDragLeave = () => setDragOverCol(null);
  const handleDrop = (e, colKey) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData(DRAG_TYPE) || e.dataTransfer.getData("text/plain");
    if (id && onMove) onMove(id, colKey);
  };

  return <Sec icon="📊" title="任務看板" count={tasks.length} right={onAddQuiz&&<Btn sm v="pri" onClick={onAddQuiz} style={{fontSize:11}}>➕ 測驗單</Btn>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(180px,1fr))",gap:8}}>
      {cols.map(col=>{const ct=tasks.filter(t=>t.status===col.k);
        const isDropTarget = dragOverCol === col.k;
        return <div key={col.k}
          onDragOver={(e)=>handleDragOver(e,col.k)}
          onDragLeave={handleDragLeave}
          onDrop={(e)=>handleDrop(e,col.k)}
          style={{ borderRadius: 12, minHeight: 120, transition: "background 0.15s", background: isDropTarget ? `${col.c}18` : "transparent", border: isDropTarget ? `2px dashed ${col.c}` : "2px solid transparent" }}
        >
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8,padding:"6px 9px",background:"rgba(255,255,255,0.02)",borderRadius:8,borderBottom:`2px solid ${col.c}`}}>
            <span style={{fontSize:12}}>{col.i}</span>
            <span style={{fontSize:12,fontWeight:600,color:col.c}}>{col.l}</span>
            <span style={{marginLeft:"auto",fontSize:10,color:C.t3}}>{ct.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,minHeight:70}}>
            {ct.map(t=>{const cc=resolveCat(t.cat);
              return <Card
                key={t.id}
                oc={`TASK_CARD_${t.id}`}
                draggable={!!onMove}
                onDragStart={(e)=>onMove && handleDragStart(e,t.id)}
                style={{ cursor: onMove ? "grab" : undefined }}
              >
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <Badge c={cc.c} bg={cc.c+"15"}>{cc.l}</Badge>
                  {t.status!=="done"?<div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ring pct={t.progress} size={32} stroke={2.5}/>
                    <span style={{position:"absolute",fontSize:8,fontWeight:700,color:C.t2}}>{t.progress}%</span>
                  </div>:<span style={{fontSize:14}}>✅</span>}
                </div>
                <div style={{fontSize:12.5,fontWeight:600,color:C.t1,marginBottom:6}}>{t.title??t.name}</div>
                <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:6}}>
                  {(t.subs||[]).map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <span style={{width:13,height:13,borderRadius:3,border:s.d?"none":`1.5px solid ${C.t3}`,background:s.d?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",flexShrink:0}}>{s.d&&"✓"}</span>
                    <span style={{color:s.d?C.t3:C.t2,textDecoration:s.d?"line-through":"none"}}>{s.t}</span>
                  </div>)}
                </div>
                <div data-oc-action={`TASK_VIEW_${t.id}`} onClick={()=>onView(t)} style={{background:"rgba(99,102,241,0.03)",borderRadius:6,padding:"5px 8px",marginBottom:6,cursor:"pointer",fontSize:10.5,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💭 {t.thought}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                    {t.auto && <Badge c={C.indigo} bg={C.indigoG}>⚡ 自動</Badge>}
                    {t.status==="queued" && onRun && <Btn oc={`TASK_RUN_${t.id}`} sm v="pri" onClick={()=>onRun(t.id)}>▶ 執行</Btn>}
                    {t.status==="in_progress" && t.auto && <Btn oc={`TASK_PROGRESS_${t.id}`} sm v="pri" onClick={()=>onProg(t.id)}>▶ 推進</Btn>}
                    {onMove && t.status!=="queued" && <Btn sm v="gh" onClick={()=>onMove(t.id,"queued")} style={{fontSize:10,color:C.t3}}>↩ 移到排隊</Btn>}
                    {onMove && t.status!=="in_progress" && <Btn sm v="gh" onClick={()=>onMove(t.id,"in_progress")} style={{fontSize:10,color:C.t3}}>⏱ 設為進行中</Btn>}
                    {onMove && t.status!=="done" && <Btn sm v="gh" onClick={()=>onMove(t.id,"done")} style={{fontSize:10,color:C.t3}}>✅ 標記完成</Btn>}
                  </div>
                  {onDelete && <Btn oc={`TASK_DELETE_${t.id}`} sm v="gh" onClick={()=>onDelete(t.id)} style={{color:C.t3,fontSize:10}}>🗑 刪除</Btn>}
                </div>
              </Card>;})}
            {ct.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:11,border:`1px dashed ${C.border}`,borderRadius:10}}>空</div>}
          </div>
        </div>;})}
    </div>
  </Sec>;
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
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
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
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
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

export function EvoPanel({log}){
  return <Sec icon="🧬" title="進化紀錄" count={log.length}>
    <div style={{position:"relative",paddingLeft:16}}>
      <div style={{position:"absolute",left:4,top:0,bottom:0,width:2,background:`linear-gradient(to bottom,${C.indigo},${C.purple},${C.green})`,borderRadius:1}}/>
      {log.map((e,i)=><div key={i} style={{position:"relative",marginBottom:12,paddingLeft:12}}>
        <div style={{position:"absolute",left:-14.5,top:4,width:9,height:9,borderRadius:5,background:e.c,border:`2px solid ${C.s1}`}}/>
        <div style={{fontSize:9.5,color:C.t3,marginBottom:1}}>{e.t}</div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.4}}>{e.x}</div>
        {e.tag&&<Badge c={e.tc} bg={e.tc+"15"} style={{marginTop:3}}>{e.tag}</Badge>}
      </div>)}
    </div>
  </Sec>;
}
