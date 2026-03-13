import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════
//  OpenClaw v4 — Ultimate Agentic Task Board
//  n8n Orchestration · Telegram Bridge · API Layer
//  RBAC Auth · Security Hardening · Plugin System
// ═══════════════════════════════════════════════════════

const C = {
  bg: "#06060a", s1: "#0c0c12", s2: "#13131b", s3: "#1a1a24",
  border: "rgba(255,255,255,0.05)", borderH: "rgba(255,255,255,0.1)",
  t1: "#eeeef2", t2: "#9d9daa", t3: "#5c5c6a",
  indigo: "#818cf8", indigoD: "#6366f1", indigoG: "rgba(99,102,241,0.1)",
  green: "#34d399", greenG: "rgba(52,211,153,0.08)",
  amber: "#fbbf24", amberG: "rgba(251,191,36,0.08)",
  red: "#f87171", redG: "rgba(248,113,113,0.08)",
  cyan: "#22d3ee", cyanG: "rgba(34,211,238,0.08)",
  purple: "#c084fc", purpleG: "rgba(192,132,252,0.08)",
  rose: "#fb7185", roseG: "rgba(251,113,133,0.08)",
};

// ─── Data Seeds ──────────────────────────

const AUTOS = [
  { id:"a1", name:"每日程式碼掃描", cron:"0 8 * * *", active:true, chain:["Scan Repo","Detect CVE","Report","Notify TG"], health:98, runs:142, lastRun:"08:00" },
  { id:"a2", name:"依賴套件更新", cron:"0 9 * * 1", active:true, chain:["Check deps","CVE match","Create PR"], health:100, runs:24, lastRun:"09:00 Mon" },
  { id:"a3", name:"效能基準測試", cron:"0 22 * * *", active:false, chain:["Load test","Log P95","Compare"], health:87, runs:89, lastRun:"22:00 昨" },
  { id:"a4", name:"知識庫掃描", cron:"0 */6 * * *", active:true, chain:["Scan radar","Score relevance","Create review"], health:95, runs:311, lastRun:"14:00" },
];

const REVIEWS = [
  { id:"r1", title:"Bun v1.2 Runtime 遷移", type:"tool", desc:"冷啟動 3x 提升", src:"技術雷達", pri:"high", status:"pending", date:"02-09",
    reasoning:"偵測到 Bun v1.2 發布。對比 Node.js 18：冷啟動 320ms→95ms、HTTP throughput +47%。遷移風險中等（6/10），需驗證 native addon 相容性。建議先在 staging PoC。" },
  { id:"r2", title:"Worker Thread 記憶體洩漏", type:"issue", desc:"高併發下記憶體異常增長", src:"自動監控", pri:"critical", status:"pending", date:"02-09",
    reasoning:"監控偵測 Worker Pool >500 req/s 時記憶體線性增長 ~12MB/min。Heap snapshot 定位到 EventEmitter listener 未解綁（callback 閉包持有 Buffer ref）。需 hotfix。" },
  { id:"r3", title:"Zod v4 驗證框架", type:"skill", desc:"強型別 + tree-shake 8KB", src:"社群", pri:"medium", status:"pending", date:"02-08",
    reasoning:"現有 23 個 API 路由各自手寫驗證。Zod v4 可統一邏輯、產出 TS 型別、bundle 僅 +8KB。ROI 高。" },
  { id:"r4", title:"WebSocket 指數退避", type:"issue", desc:"避免重連雪崩", src:"日誌分析", pri:"high", status:"approved", date:"02-07",
    reasoning:"斷線後同時重連造成伺服器過載。設計 exponential backoff + jitter 方案。" },
  { id:"r5", title:"Drizzle ORM", type:"learn", desc:"TS 原生 ORM，效能 2.4x Prisma", src:"知識庫", pri:"medium", status:"approved", date:"02-06",
    reasoning:"Drizzle 完全 edge-compatible、查詢效能高、型別安全。值得投入學習。" },
];

const TASKS = [
  { id:"t1", title:"修復 WebSocket 重連雪崩", cat:"bugfix", status:"in_progress", progress:65, auto:true, fromR:"r4",
    subs:[{t:"分析重連邏輯",d:true},{t:"指數退避演算法",d:true},{t:"壓力測試",d:false},{t:"部署 staging",d:false}],
    thought:"壓力測試中：1000 連線同時斷線，觀察 CPU/RAM 變化..." },
  { id:"t2", title:"學習 Drizzle ORM", cat:"learn", status:"in_progress", progress:30, auto:false, fromR:"r5",
    subs:[{t:"官方文件",d:true},{t:"PoC 專案",d:false},{t:"效能對比",d:false},{t:"遷移方案",d:false}],
    thought:"文件閱讀完成。下一步：SQLite PoC 後切 Postgres。" },
  { id:"t3", title:"API 快取層", cat:"feature", status:"queued", progress:0, auto:true,
    subs:[{t:"需求分析",d:false},{t:"Redis vs Memcached",d:false},{t:"架構文件",d:false},{t:"實作測試",d:false}],
    thought:"排隊中，WebSocket 修復後啟動。" },
  { id:"t4", title:"CI/CD 加速", cat:"improve", status:"done", progress:100, auto:true,
    subs:[{t:"瓶頸分析",d:true},{t:"平行建置",d:true},{t:"快取 modules",d:true},{t:"驗證成效",d:true}],
    thought:"✅ 建置 12min → 3.8min（-68%）" },
];

const N8N_FLOWS = [
  { id:"n1", name:"OpenClaw Agent → Supabase Sync", status:"active", trigger:"Webhook", nodes:8, execs:1247, lastExec:"2 min ago",
    desc:"接收 OpenClaw 任務結果，寫入 Supabase tasks/reviews 表，觸發 Telegram 通知" },
  { id:"n2", name:"Telegram → 審核指令路由", status:"active", trigger:"Telegram Trigger", nodes:12, execs:89, lastExec:"15 min ago",
    desc:"解析 /approve /reject /status 指令，更新 Supabase 審核狀態，回傳結果" },
  { id:"n3", name:"排程自動化執行器", status:"active", trigger:"Cron", nodes:6, execs:432, lastExec:"08:00",
    desc:"依據 automations 表的 cron 設定，觸發對應的掃描/測試流程" },
  { id:"n4", name:"告警推送 Pipeline", status:"active", trigger:"Supabase Realtime", nodes:5, execs:34, lastExec:"09:15",
    desc:"監聽 critical 等級審核項目，即時推送 Telegram + Email 告警" },
  { id:"n5", name:"API Rate Limiter", status:"draft", trigger:"Webhook", nodes:4, execs:0, lastExec:"—",
    desc:"對外部 API 呼叫進行速率限制，防止 token 超支" },
];

const API_ENDPOINTS = [
  { method:"GET", path:"/api/tasks", auth:"user+", desc:"取得任務列表", rateLimit:"100/min", status:"live" },
  { method:"POST", path:"/api/tasks", auth:"admin", desc:"建立新任務", rateLimit:"30/min", status:"live" },
  { method:"PATCH", path:"/api/tasks/:id/progress", auth:"agent", desc:"OpenClaw 更新進度", rateLimit:"60/min", status:"live" },
  { method:"GET", path:"/api/reviews", auth:"user+", desc:"取得審核項目", rateLimit:"100/min", status:"live" },
  { method:"POST", path:"/api/reviews/:id/approve", auth:"admin", desc:"批准審核", rateLimit:"20/min", status:"live" },
  { method:"POST", path:"/api/reviews/:id/reject", auth:"admin", desc:"駁回審核", rateLimit:"20/min", status:"live" },
  { method:"POST", path:"/api/webhook/openclaw", auth:"api_key", desc:"n8n Webhook 接口", rateLimit:"200/min", status:"live" },
  { method:"POST", path:"/api/webhook/telegram", auth:"tg_secret", desc:"Telegram Bot Webhook", rateLimit:"300/min", status:"live" },
  { method:"GET", path:"/api/automations", auth:"user+", desc:"取得自動化列表", rateLimit:"60/min", status:"live" },
  { method:"POST", path:"/api/plugins/register", auth:"admin", desc:"註冊新 Plugin", rateLimit:"10/min", status:"beta" },
];

const SECURITY_LAYERS = [
  { id:"s1", name:"Supabase Auth + JWT", status:"active", detail:"Email / Magic Link / OAuth 登入，JWT 自動附帶 role claim", icon:"🔐" },
  { id:"s2", name:"RLS 資料庫層防護", status:"active", detail:"每張表啟用 Row Level Security，依 user_role + auth.uid() 過濾", icon:"🛡️" },
  { id:"s3", name:"RBAC 角色權限", status:"active", detail:"admin / user / agent 三層角色，透過 Custom Access Token Hook 注入 JWT", icon:"👤" },
  { id:"s4", name:"API Rate Limiting", status:"active", detail:"Upstash Redis 速率限制，IP + User 雙維度，防止暴力攻擊", icon:"⏱️" },
  { id:"s5", name:"Webhook 簽名驗證", status:"active", detail:"n8n / Telegram Webhook 使用 HMAC-SHA256 簽名驗證", icon:"✍️" },
  { id:"s6", name:"CSP + CORS 防護", status:"active", detail:"嚴格 Content-Security-Policy，僅允許白名單 Origin", icon:"🌐" },
  { id:"s7", name:"Audit Log 稽核", status:"active", detail:"所有管理操作寫入 audit_logs 表，含 IP / UA / 變更 diff", icon:"📝" },
  { id:"s8", name:"環境變數加密", status:"active", detail:"Vercel Encrypted Env + Supabase Vault 管理 secrets", icon:"🔒" },
];

const RBAC_MATRIX = [
  { resource:"tasks", admin:"CRUD", user:"R", agent:"RU" },
  { resource:"reviews", admin:"CRUD", user:"R", agent:"CR" },
  { resource:"automations", admin:"CRUD", user:"R", agent:"R" },
  { resource:"evolution_log", admin:"CRUD", user:"R", agent:"C" },
  { resource:"plugins", admin:"CRUD", user:"R", agent:"—" },
  { resource:"audit_logs", admin:"R", user:"—", agent:"—" },
  { resource:"user_settings", admin:"CRUD", user:"RU (own)", agent:"—" },
];

const PLUGINS = [
  { id:"p1", name:"GitHub Scanner", status:"active", desc:"掃描 Repo issue / PR / CVE", icon:"🐙", calls:1247 },
  { id:"p2", name:"Telegram Bridge", status:"active", desc:"雙向指令 + 通知推送", icon:"✈️", calls:892 },
  { id:"p3", name:"Sentry Monitor", status:"active", desc:"錯誤追蹤 + 自動建立 review", icon:"🔴", calls:156 },
  { id:"p4", name:"Notion Sync", status:"inactive", desc:"同步任務到 Notion 看板", icon:"📓", calls:0 },
  { id:"p5", name:"Slack Notifier", status:"inactive", desc:"推送到 Slack Channel", icon:"💬", calls:0 },
  { id:"p6", name:"Custom Tool (可擴充)", status:"template", desc:"你的下一個 Plugin...", icon:"🧩", calls:0 },
];

// ─── Micro Components ────────────────────

const Pulse = ({c=C.green,s=6}) => <span style={{position:"relative",display:"inline-block",width:s,height:s,marginRight:5,flexShrink:0}}>
  <span style={{position:"absolute",inset:0,borderRadius:"50%",background:c,animation:"oc-p 2s ease-in-out infinite"}}/>
  <span style={{position:"absolute",inset:0,borderRadius:"50%",background:c}}/>
</span>;

const Badge = ({children,c,bg,mono,style={}}) => <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:mono?6:99,fontSize:10,fontWeight:650,color:c,background:bg,letterSpacing:mono?0.5:0.2,fontFamily:mono?"'JetBrains Mono',monospace":"inherit",whiteSpace:"nowrap",...style}}>{children}</span>;

const Ring = ({pct,size=36,stroke=3}) => {
  const r=(size-stroke)/2, ci=2*Math.PI*r, col=pct===100?C.green:pct>50?C.amber:C.indigo;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeDasharray={ci} strokeDashoffset={ci-(pct/100)*ci} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
  </svg>;
};

function Btn({children,onClick,v="def",sm,dis,style={}}){
  const[h,sH]=useState(false);
  const vs={
    def:{bg:h?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)",c:C.t1,b:`1px solid ${C.border}`},
    pri:{bg:h?"#5558e6":C.indigoD,c:"#fff",b:"none"},
    ok:{bg:h?"#1db954":C.green,c:"#fff",b:"none"},
    no:{bg:h?C.redG:"rgba(248,113,113,0.06)",c:C.red,b:`1px solid rgba(248,113,113,0.12)`},
    gh:{bg:"transparent",c:h?C.t1:C.t2,b:"none"},
  };const vv=vs[v];
  return <button onClick={onClick} disabled={dis} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:dis?"rgba(255,255,255,0.01)":vv.bg,color:dis?C.t3:vv.c,border:vv.b,borderRadius:9,padding:sm?"4px 11px":"7px 15px",fontSize:sm?11:12.5,fontWeight:600,cursor:dis?"not-allowed":"pointer",transition:"all .15s",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",...style}}>{children}</button>;
}

function Card({children,style={},glow,onClick}){
  const[h,sH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:h?C.s3:C.s2,border:glow?`1px solid ${glow}25`:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:onClick?"pointer":"default",transition:"all .2s",boxShadow:glow&&h?`0 0 20px ${glow}10`:"none",...style}}>{children}</div>;
}

function Sec({icon,title,count,right,children}){
  return <div style={{marginBottom:24}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:15}}>{icon}</span>
        <h2 style={{margin:0,fontSize:14,fontWeight:700,color:C.t1,letterSpacing:-.3}}>{title}</h2>
        {count!==undefined&&<span style={{background:"rgba(255,255,255,0.05)",color:C.t3,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:99}}>{count}</span>}
      </div>{right}
    </div>{children}
  </div>;
}

// ─── Thought Drawer ──────────────────────

function Drawer({item,onClose}){
  if(!item)return null;
  return <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(5px)",zIndex:1000,display:"flex",justifyContent:"flex-end",animation:"oc-fi .15s"}}>
    <div style={{width:420,maxWidth:"90vw",height:"100%",background:C.s1,borderLeft:`1px solid ${C.border}`,padding:24,overflowY:"auto",animation:"oc-sl .2s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700,color:C.t1}}>🧠 思維紀錄</h3>
        <Btn sm v="gh" onClick={onClose}>✕</Btn>
      </div>
      <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:10}}>{item.title}</div>
      <div style={{background:C.indigoG,border:`1px solid rgba(99,102,241,0.1)`,borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:10,color:C.indigo,fontWeight:650,marginBottom:6,letterSpacing:.4}}>REASONING LOG</div>
        <div style={{fontSize:12.5,color:C.t2,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{item.reasoning||item.thought||"—"}</div>
      </div>
      {item.subs&&<>
        <div style={{fontSize:10,color:C.t3,fontWeight:650,marginBottom:6,letterSpacing:.4}}>SUBTASKS</div>
        {item.subs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:s.d?C.t3:C.t2,marginBottom:5}}>
          <span style={{width:15,height:15,borderRadius:4,border:s.d?"none":`1.5px solid ${C.t3}`,background:s.d?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",flexShrink:0}}>{s.d&&"✓"}</span>
          <span style={{textDecoration:s.d?"line-through":"none"}}>{s.t}</span>
        </div>)}
      </>}
    </div>
  </div>;
}

// ─── Panels ──────────────────────────────

function Stats({tasks,autos,reviews}){
  const d=tasks.filter(t=>t.status==="done").length, ip=tasks.filter(t=>t.status==="in_progress").length;
  const avg=tasks.length?Math.round(tasks.reduce((s,t)=>s+t.progress,0)/tasks.length):0;
  const items=[
    {l:"總體進度",v:avg+"%",c:C.indigo},{l:"完成",v:`${d}/${tasks.length}`,c:C.green},
    {l:"進行中",v:ip,c:C.amber},{l:"自動化",v:autos.filter(a=>a.active).length+" 啟用",c:C.purple},
    {l:"待審核",v:reviews.filter(r=>r.status==="pending").length,c:C.red},
  ];
  return <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
    {items.map((s,i)=><div key={i} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
      <div style={{fontSize:20,fontWeight:800,color:s.c,letterSpacing:-.5}}>{s.v}</div>
      <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:500}}>{s.l}</div>
    </div>)}
  </div>;
}

function AutoPanel({autos,onTog}){
  return <Sec icon="⚡" title="自動化流程" count={autos.filter(a=>a.active).length+" 啟用"}>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {autos.map(a=><Card key={a.id} glow={a.active?C.green:undefined}>
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
            <button onClick={()=>onTog(a.id)} style={{width:40,height:21,borderRadius:11,border:"none",background:a.active?C.green:"rgba(255,255,255,0.07)",position:"relative",cursor:"pointer",transition:"background .2s"}}>
              <span style={{position:"absolute",width:17,height:17,borderRadius:9,background:"#fff",top:2,left:a.active?21:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            </button>
            <span style={{fontSize:9.5,color:a.health>95?C.green:a.health>85?C.amber:C.red}}>● {a.health}%</span>
          </div>
        </div>
      </Card>)}
    </div>
  </Sec>;
}

function ReviewPanel({reviews,onOk,onNo,onView}){
  const pending=reviews.filter(r=>r.status==="pending"), approved=reviews.filter(r=>r.status==="approved");
  const priCfg={critical:{l:"嚴重",c:C.red,bg:C.redG},high:{l:"高",c:C.amber,bg:C.amberG},medium:{l:"中",c:C.green,bg:C.greenG}};
  const typI={tool:"⚙️",skill:"🧠",issue:"🔧",learn:"📚"};
  return <Sec icon="🔍" title="審核中心" count={pending.length+" 待審"}>
    {pending.length===0&&<div style={{textAlign:"center",padding:24,color:C.t3,fontSize:12}}>✓ 全部審核完畢</div>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {pending.map(r=>{const pc=priCfg[r.pri]||priCfg.medium;
        return <Card key={r.id} glow={r.pri==="critical"?C.red:undefined}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}}>
              <span style={{fontSize:13}}>{typI[r.type]}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
            </div>
            <Badge c={pc.c} bg={pc.bg}>{pc.l}</Badge>
          </div>
          <p style={{fontSize:12,color:C.t2,margin:"0 0 6px",lineHeight:1.4}}>{r.desc}</p>
          <div onClick={()=>onView(r)} style={{background:C.indigoG,borderRadius:7,padding:"6px 10px",marginBottom:8,cursor:"pointer",fontSize:11,color:C.t3,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            💭 {r.reasoning}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:C.t3}}>{r.src} · {r.date}</span>
            <div style={{display:"flex",gap:5}}>
              <Btn sm v="no" onClick={()=>onNo(r.id)}>✕</Btn>
              <Btn sm v="ok" onClick={()=>onOk(r.id)}>✓ 批准</Btn>
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

function TaskBoard({tasks,onProg,onView}){
  const cols=[{k:"queued",l:"排隊中",i:"📋",c:C.t3},{k:"in_progress",l:"進行中",i:"🔄",c:C.indigo},{k:"done",l:"完成",i:"✅",c:C.green}];
  const catC={bugfix:{l:"修復",c:C.red},learn:{l:"學習",c:C.purple},feature:{l:"功能",c:C.indigo},improve:{l:"改進",c:C.green}};
  return <Sec icon="📊" title="任務看板" count={tasks.length}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
      {cols.map(col=>{const ct=tasks.filter(t=>t.status===col.k);
        return <div key={col.k}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8,padding:"6px 9px",background:"rgba(255,255,255,0.02)",borderRadius:8,borderBottom:`2px solid ${col.c}`}}>
            <span style={{fontSize:12}}>{col.i}</span>
            <span style={{fontSize:12,fontWeight:600,color:col.c}}>{col.l}</span>
            <span style={{marginLeft:"auto",fontSize:10,color:C.t3}}>{ct.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,minHeight:70}}>
            {ct.map(t=>{const cc=catC[t.cat];
              return <Card key={t.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <Badge c={cc.c} bg={cc.c+"15"}>{cc.l}</Badge>
                  {t.status!=="done"?<div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ring pct={t.progress} size={32} stroke={2.5}/>
                    <span style={{position:"absolute",fontSize:8,fontWeight:700,color:C.t2}}>{t.progress}%</span>
                  </div>:<span style={{fontSize:14}}>✅</span>}
                </div>
                <div style={{fontSize:12.5,fontWeight:600,color:C.t1,marginBottom:6}}>{t.title}</div>
                <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:6}}>
                  {t.subs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <span style={{width:13,height:13,borderRadius:3,border:s.d?"none":`1.5px solid ${C.t3}`,background:s.d?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",flexShrink:0}}>{s.d&&"✓"}</span>
                    <span style={{color:s.d?C.t3:C.t2,textDecoration:s.d?"line-through":"none"}}>{s.t}</span>
                  </div>)}
                </div>
                <div onClick={()=>onView(t)} style={{background:"rgba(99,102,241,0.03)",borderRadius:6,padding:"5px 8px",marginBottom:6,cursor:"pointer",fontSize:10.5,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💭 {t.thought}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  {t.auto?<Badge c={C.indigo} bg={C.indigoG}>⚡ 自動</Badge>:<span/>}
                  {t.status==="in_progress"&&t.auto&&<Btn sm v="pri" onClick={()=>onProg(t.id)}>▶ 推進</Btn>}
                </div>
              </Card>;})}
            {ct.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:11,border:`1px dashed ${C.border}`,borderRadius:10}}>空</div>}
          </div>
        </div>;})}
    </div>
  </Sec>;
}

// ─── n8n Panel ───────────────────────────

function N8nPanel(){
  const stC={active:C.green,draft:C.t3};
  return <Sec icon="🔗" title="n8n 工作流" count={N8N_FLOWS.length} right={<Badge c={C.amber} bg={C.amberG}>Token 節省模式</Badge>}>
    <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:650,color:C.amber,marginBottom:6}}>💡 Token 節省架構</div>
      <div style={{fontSize:11.5,color:C.t2,lineHeight:1.6}}>
        n8n 負責排程觸發、資料路由、Webhook 接收<br/>
        OpenClaw (LLM) 僅在需要推理時被呼叫<br/>
        結構化指令 (JSON) 傳輸，非自然語言 → <span style={{color:C.green}}>節省 ~70% Token</span>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {N8N_FLOWS.map(f=><Card key={f.id} glow={f.status==="active"?C.green:undefined}>
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

// ─── API Panel ───────────────────────────

function ApiPanel(){
  const mC={GET:C.green,POST:C.amber,PATCH:C.indigo,DELETE:C.red};
  return <Sec icon="🔌" title="API 端點" count={API_ENDPOINTS.length} right={<Badge c={C.cyan} bg={C.cyanG}>REST + Webhook</Badge>}>
    <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"70px 1fr 70px 80px 50px",gap:0,padding:"8px 12px",background:"rgba(255,255,255,0.02)",fontSize:10,fontWeight:650,color:C.t3,letterSpacing:.3}}>
        <span>METHOD</span><span>PATH</span><span>AUTH</span><span>LIMIT</span><span>狀態</span>
      </div>
      {API_ENDPOINTS.map((e,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"70px 1fr 70px 80px 50px",gap:0,padding:"7px 12px",background:i%2===0?C.s2:"transparent",fontSize:11,alignItems:"center",borderTop:`1px solid ${C.border}`}}>
        <Badge c={mC[e.method]} bg={mC[e.method]+"12"} mono>{e.method}</Badge>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.path}</span>
        <Badge c={C.purple} bg={C.purpleG}>{e.auth}</Badge>
        <span style={{fontSize:10,color:C.t3}}>{e.rateLimit}</span>
        <Badge c={e.status==="live"?C.green:C.amber} bg={e.status==="live"?C.greenG:C.amberG}>{e.status}</Badge>
      </div>)}
    </div>
  </Sec>;
}

// ─── Security Panel ──────────────────────

function SecurityPanel(){
  return <Sec icon="🛡️" title="安全防護" count={SECURITY_LAYERS.length+" 層"} right={<Badge c={C.green} bg={C.greenG}>全層啟用</Badge>}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
      {SECURITY_LAYERS.map(s=><Card key={s.id} glow={C.green}>
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
      {RBAC_MATRIX.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",padding:"6px 12px",fontSize:11,alignItems:"center",borderTop:`1px solid ${C.border}`,background:i%2===0?"rgba(255,255,255,0.01)":"transparent"}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.t1,fontSize:10.5}}>{r.resource}</span>
        <span style={{color:C.green,fontWeight:600,fontSize:10}}>{r.admin}</span>
        <span style={{color:C.amber,fontSize:10}}>{r.user}</span>
        <span style={{color:C.indigo,fontSize:10}}>{r.agent}</span>
      </div>)}
    </div>
  </Sec>;
}

// ─── Plugin Panel ────────────────────────

function PluginPanel(){
  const stC={active:C.green,inactive:C.t3,template:C.amber};
  return <Sec icon="🧩" title="Plugin 市集" count={PLUGINS.length} right={<Badge c={C.amber} bg={C.amberG}>可擴充架構</Badge>}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      {PLUGINS.map(p=><Card key={p.id} glow={p.status==="active"?C.green:p.status==="template"?C.amber:undefined} style={p.status==="template"?{borderStyle:"dashed"}:{}}>
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

// ─── Evolution ───────────────────────────

function EvoPanel({log}){
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

// ─── Main App ────────────────────────────

export default function OpenClawV4(){
  const[autos,setAutos]=useState(AUTOS);
  const[reviews,setReviews]=useState(REVIEWS);
  const[tasks,setTasks]=useState(TASKS);
  const[tab,setTab]=useState("all");
  const[drawer,setDrawer]=useState(null);
  const now=new Date();

  const[evo,setEvo]=useState([
    {t:"14:30",x:"推進「WebSocket 重連修復」— 指數退避完成 → 65%",c:C.indigo,tag:"自動執行",tc:C.indigo},
    {t:"12:00",x:"偵測 Bun v1.2 → 自動建立審核項目",c:C.amber,tag:"發現",tc:C.amber},
    {t:"09:15",x:"掃描發現 Worker Thread 記憶體洩漏 → 提交審核",c:C.red,tag:"問題",tc:C.red},
    {t:"08:00",x:"CI/CD 加速完成：12min → 3.8min（-68%）",c:C.green,tag:"完成",tc:C.green},
    {t:"昨日",x:"知識庫發現 Drizzle ORM → 建立學習計畫",c:C.purple,tag:"學習",tc:C.purple},
  ]);

  const addE=(x,c,tag,tc)=>setEvo(p=>[{t:now.toTimeString().slice(0,5),x,c,tag,tc},...p]);
  const togA=id=>setAutos(p=>p.map(a=>a.id===id?{...a,active:!a.active}:a));

  const okR=id=>{const r=reviews.find(r=>r.id===id);setReviews(p=>p.map(r=>r.id===id?{...r,status:"approved"}:r));
    if(r)addE(`審核通過「${r.title}」→ 排入執行`,C.green,"批准",C.green);};
  const noR=id=>{const r=reviews.find(r=>r.id===id);setReviews(p=>p.map(r=>r.id===id?{...r,status:"rejected"}:r));
    if(r)addE(`駁回「${r.title}」`,C.t3,"駁回",C.t3);};

  const progT=id=>setTasks(p=>p.map(t=>{
    if(t.id!==id)return t;const ni=t.subs.findIndex(s=>!s.d);if(ni===-1)return t;
    const ns=t.subs.map((s,i)=>i===ni?{...s,d:true}:s);
    const np=Math.round((ns.filter(s=>s.d).length/ns.length)*100), ad=ns.every(s=>s.d);
    addE(`推進「${t.title}」— 完成「${t.subs[ni].t}」→ ${np}%${ad?" ✅":""}`,ad?C.green:C.indigo,ad?"完成":"推進",ad?C.green:C.indigo);
    return{...t,subs:ns,progress:np,status:ad?"done":t.status,thought:ad?"✅ 完成！":`執行中：${ns[ni+1]?.t||"收尾"}...`};
  }));

  const tabs=[
    {k:"all",l:"總覽"},{k:"auto",l:"⚡ 自動化"},{k:"review",l:"🔍 審核"},{k:"tasks",l:"📊 任務"},
    {k:"n8n",l:"🔗 n8n"},{k:"api",l:"🔌 API"},{k:"security",l:"🛡️ 安全"},{k:"plugins",l:"🧩 Plugin"},{k:"evo",l:"🧬 進化"},
  ];

  const renderTab=()=>{
    if(tab==="all") return <>
      <Stats tasks={tasks} autos={autos} reviews={reviews}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div><AutoPanel autos={autos} onTog={togA}/><ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onView={setDrawer}/><N8nPanel/></div>
        <div><TaskBoard tasks={tasks} onProg={progT} onView={setDrawer}/><SecurityPanel/><PluginPanel/><EvoPanel log={evo}/></div>
      </div>
    </>;
    if(tab==="auto") return <div style={{maxWidth:680}}><AutoPanel autos={autos} onTog={togA}/></div>;
    if(tab==="review") return <div style={{maxWidth:680}}><ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onView={setDrawer}/></div>;
    if(tab==="tasks") return <><Stats tasks={tasks} autos={autos} reviews={reviews}/><TaskBoard tasks={tasks} onProg={progT} onView={setDrawer}/></>;
    if(tab==="n8n") return <div style={{maxWidth:720}}><N8nPanel/></div>;
    if(tab==="api") return <div style={{maxWidth:800}}><ApiPanel/></div>;
    if(tab==="security") return <div style={{maxWidth:800}}><SecurityPanel/></div>;
    if(tab==="plugins") return <div style={{maxWidth:720}}><PluginPanel/></div>;
    return <div style={{maxWidth:680}}><EvoPanel log={evo}/></div>;
  };

  return <div style={{minHeight:"100vh",background:C.bg,color:C.t1,fontFamily:"'Geist','SF Pro Display',-apple-system,sans-serif"}}>
    <style>{`
      @keyframes oc-p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(2)}}
      @keyframes oc-fi{from{opacity:0}to{opacity:1}}
      @keyframes oc-sl{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes oc-su{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      *{scrollbar-width:thin;scrollbar-color:#1a1a24 transparent}
      ::placeholder{color:${C.t3}}
    `}</style>

    {/* Header */}
    <div style={{padding:"14px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(6,6,10,0.9)",backdropFilter:"blur(14px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.indigoD},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 4px 14px ${C.indigoG}`}}>🦀</div>
        <div>
          <h1 style={{margin:0,fontSize:17,fontWeight:800,letterSpacing:-.5,lineHeight:1.2}}>OpenClaw<span style={{fontWeight:400,color:C.t3,marginLeft:7,fontSize:12}}>v4 Ultimate Board</span></h1>
          <div style={{fontSize:10,color:C.t3,marginTop:1}}>n8n + Telegram + Supabase + Vercel · RBAC · Plugin System</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:10,color:C.t3}}>✈️ TG</span><Pulse c={C.green} s={5}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:10,color:C.t3}}>🔗 n8n</span><Pulse c={C.green} s={5}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <Pulse c={C.green}/><span style={{fontSize:11,color:C.green,fontWeight:500}}>Online</span>
        </div>
      </div>
    </div>

    {/* Tabs */}
    <div style={{padding:"8px 24px",display:"flex",gap:2,borderBottom:`1px solid rgba(255,255,255,0.02)`,background:"rgba(6,6,10,0.5)",overflowX:"auto"}}>
      {tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:tab===t.k?"rgba(255,255,255,0.06)":"transparent",color:tab===t.k?C.t1:C.t3,fontSize:12,fontWeight:tab===t.k?600:500,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",fontFamily:"inherit"}}>{t.l}</button>)}
    </div>

    {/* Content */}
    <div style={{padding:"20px 24px",maxWidth:1440,margin:"0 auto",animation:"oc-su .2s ease"}} key={tab}>
      {renderTab()}
    </div>

    {drawer&&<Drawer item={drawer} onClose={()=>setDrawer(null)}/>}
  </div>;
}
