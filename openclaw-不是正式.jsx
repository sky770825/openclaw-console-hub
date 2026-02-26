import { useState, useEffect, useCallback, useRef, memo } from "react";
import { toast } from "sonner";

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

// API 端點說明：name=API 名稱, auth=驗證類型, authDesc=驗證說明, storage=資料儲存位置
const API_ENDPOINTS = [
  { name:"任務列表", method:"GET", path:"/api/tasks", auth:"user+", authDesc:"登入用戶或以上（JWT）", desc:"取得任務列表", rateLimit:"100/min", status:"live", storage:"Supabase · tasks" },
  { name:"建立任務", method:"POST", path:"/api/tasks", auth:"admin", authDesc:"管理員（JWT role=admin）", desc:"建立新任務", rateLimit:"30/min", status:"live", storage:"Supabase · tasks" },
  { name:"更新任務進度", method:"PATCH", path:"/api/tasks/:id/progress", auth:"agent", authDesc:"OpenClaw Agent 專用（Bearer Token）", desc:"Agent 回報任務進度、子任務完成狀態", rateLimit:"60/min", status:"live", storage:"Supabase · tasks" },
  { name:"審核列表", method:"GET", path:"/api/reviews", auth:"user+", authDesc:"登入用戶或以上（JWT）", desc:"取得待審核/已批准項目", rateLimit:"100/min", status:"live", storage:"Supabase · reviews" },
  { name:"批准審核", method:"POST", path:"/api/reviews/:id/approve", auth:"admin", authDesc:"管理員（JWT role=admin）", desc:"批准審核項目，寫入 reviews.status=approved", rateLimit:"20/min", status:"live", storage:"Supabase · reviews" },
  { name:"駁回審核", method:"POST", path:"/api/reviews/:id/reject", auth:"admin", authDesc:"管理員（JWT role=admin）", desc:"駁回審核項目，寫入 reviews.status=rejected", rateLimit:"20/min", status:"live", storage:"Supabase · reviews" },
  { name:"OpenClaw Webhook", method:"POST", path:"/api/webhook/openclaw", auth:"api_key", authDesc:"請求需帶 X-API-Key 或 Authorization Bearer", desc:"n8n 接收 Agent 結果後呼叫，寫入 tasks/reviews", rateLimit:"200/min", status:"live", storage:"Supabase · tasks, reviews" },
  { name:"Telegram Webhook", method:"POST", path:"/api/webhook/telegram", auth:"tg_secret", authDesc:"Header 驗證 Telegram Bot Webhook Secret（HMAC）", desc:"接收 Telegram 指令（/approve /reject 等）", rateLimit:"300/min", status:"live", storage:"Supabase · reviews（更新狀態）" },
  { name:"自動化列表", method:"GET", path:"/api/automations", auth:"user+", authDesc:"登入用戶或以上（JWT）", desc:"取得排程自動化清單（含 cron、啟用狀態）", rateLimit:"60/min", status:"live", storage:"Supabase · automations" },
  { name:"註冊 Plugin", method:"POST", path:"/api/plugins/register", auth:"admin", authDesc:"管理員（JWT role=admin）", desc:"註冊新 Plugin，寫入 plugins 表", rateLimit:"10/min", status:"beta", storage:"Supabase · plugins" },
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

function Btn({children,onClick,v="def",size="md",dis,style={},oc}){
  const[h,sH]=useState(false);
  const sizes={
    sm:{padding:"6px 12px",minHeight:32,fontSize:11},
    md:{padding:"8px 16px",minHeight:36,fontSize:12},
    lg:{padding:"10px 20px",minHeight:44,fontSize:13}
  };
  const sz=sizes[size]||sizes.md;
  const vs={
    def:{bg:h?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.04)",c:C.t1,b:`1px solid ${h?C.borderH:C.border}`},
    pri:{bg:h?"#5558e6":C.indigoD,c:"#fff",b:"none"},
    ok:{bg:h?"#1db954":C.green,c:"#fff",b:"none"},
    no:{bg:h?"rgba(248,113,113,0.15)":"rgba(248,113,113,0.08)",c:C.red,b:`1px solid rgba(248,113,113,0.25)`},
    gh:{bg:"transparent",c:h?C.t1:"#b0b0bd",b:"none"},
  };const vv=vs[v];
  const handleClick=(e)=>{e.stopPropagation();e.preventDefault();onClick?.(e);};
  return <button type="button" data-oc-action={oc} onClick={handleClick} disabled={dis} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:dis?"rgba(255,255,255,0.02)":vv.bg,color:dis?C.t3:vv.c,border:vv.b,borderRadius:10,padding:sz.padding,minHeight:sz.minHeight,fontSize:sz.fontSize,fontWeight:600,cursor:dis?"not-allowed":"pointer",transition:"all .15s",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit",position:"relative",zIndex:1,pointerEvents:dis?"none":"auto",...style}}>{children}</button>;
}

function Card({children,style={},glow,onClick,oc}){
  const[h,sH]=useState(false);
  return <div data-oc-action={oc} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
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

// ─── Thought / Edit Drawer ──────────────────────

const Drawer=memo(function Drawer({item,onClose,onSave}){
  const[editing,setEditing]=useState(false);
  const[form,setForm]=useState(()=>({...item,subs:item.subs?[...item.subs]:[],chain:item.chain?[...item.chain]:[]}));
  useEffect(()=>{if(item){setForm({...item,subs:item.subs?[...item.subs]:[],chain:item.chain?[...item.chain]:[]});setEditing(false);}},[item?.id]);
  if(!item)return null;

  const isTask=item.subs!==undefined;
  const isAuto=item.chain!==undefined;

  const handleSave=()=>{
    const out=isTask?{...form,subs:form.subs}:isAuto?{...form,chain:form.chain}:form;
    onSave?.(out);
    onClose();
  };

  return <div onClick={e=>e.target===e.currentTarget&&!editing&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(5px)",zIndex:1000,display:"flex",justifyContent:"flex-end",animation:"oc-fi .15s"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:440,maxWidth:"90vw",height:"100%",background:C.s1,borderLeft:`1px solid ${C.border}`,padding:24,overflowY:"auto",animation:"oc-sl .2s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700,color:C.t1}}>{editing?"✏️ 編輯":"🧠 思維紀錄"}</h3>
        <div style={{display:"flex",gap:6}}>
          {onSave&&!editing&&<Btn oc="DRAWER_EDIT" size="md" v="gh" onClick={()=>{setForm({...item,subs:item.subs?[...item.subs]:[],chain:item.chain?[...item.chain]:[]});setEditing(true);}}>✎ 編輯</Btn>}
          {editing?<><Btn oc="DRAWER_CANCEL" size="md" v="gh" onClick={()=>setEditing(false)}>取消</Btn><Btn oc="DRAWER_SAVE" size="md" v="pri" onClick={handleSave}>儲存</Btn></>:<Btn oc="DRAWER_CLOSE" size="md" v="gh" onClick={onClose}>✕ 關閉</Btn>}
        </div>
      </div>

      {editing?(<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <label style={{fontSize:11,color:C.t3}}>標題</label>
        <input value={form.title||""} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="標題" style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.t1,fontSize:13}}/>
        {isTask&&<><label style={{fontSize:11,color:C.t3}}>思維 / 備註</label><textarea value={form.thought||""} onChange={e=>setForm(p=>({...p,thought:e.target.value}))} placeholder="目前進度、思考..." rows={3} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.t1,fontSize:12,resize:"vertical"}}/></>}
        {!isTask&&!isAuto&&<><label style={{fontSize:11,color:C.t3}}>描述</label><input value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="描述" style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.t1,fontSize:13}}/><label style={{fontSize:11,color:C.t3}}>推理 / 理由</label><textarea value={form.reasoning||""} onChange={e=>setForm(p=>({...p,reasoning:e.target.value}))} placeholder="推理 / 理由" rows={3} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.t1,fontSize:12,resize:"vertical"}}/></>}
        {isAuto&&<><label style={{fontSize:11,color:C.t3}}>Cron 表達式</label><input value={form.cron||""} onChange={e=>setForm(p=>({...p,cron:e.target.value}))} placeholder="0 8 * * *" style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.t1,fontSize:12,fontFamily:"monospace"}}/><label style={{fontSize:11,color:C.t3}}>流程鏈（逗號分隔）</label><input value={Array.isArray(form.chain)?form.chain.join(", "):""} onChange={e=>setForm(p=>({...p,chain:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))} placeholder="Step1, Step2, Step3" style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.t1,fontSize:12}}/></>}
        {isTask&&form.subs&&<><label style={{fontSize:11,color:C.t3}}>子任務</label>{form.subs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><input type="checkbox" checked={s.d} onChange={e=>setForm(p=>({...p,subs:p.subs.map((x,j)=>j===i?{...x,d:e.target.checked}:x)}))}/><input value={s.t} onChange={e=>setForm(p=>({...p,subs:p.subs.map((x,j)=>j===i?{...x,t:e.target.value}:x)}))} style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:6,color:C.t1,fontSize:12}}/></div>)}</>}
      </div>):(<>
        <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:10}}>{item.title}</div>
        <div style={{background:C.indigoG,border:`1px solid rgba(99,102,241,0.1)`,borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:10,color:C.indigo,fontWeight:650,marginBottom:6,letterSpacing:.4}}>REASONING LOG</div>
          <div style={{fontSize:12.5,color:C.t2,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{item.reasoning||item.thought||"—"}</div>
        </div>
        {item.subs&&<><div style={{fontSize:10,color:C.t3,fontWeight:650,marginBottom:6,letterSpacing:.4}}>SUBTASKS</div>{item.subs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:s.d?C.t3:C.t2,marginBottom:5}}><span style={{width:15,height:15,borderRadius:4,border:s.d?"none":`1.5px solid ${C.t3}`,background:s.d?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",flexShrink:0}}>{s.d&&"✓"}</span><span style={{textDecoration:s.d?"line-through":"none"}}>{s.t}</span></div>)}</>}
        {item.chain&&<><div style={{fontSize:10,color:C.t3,fontWeight:650,marginBottom:6}}>流程鏈</div><div style={{fontSize:12,color:C.t2}}>{item.chain.join(" → ")}</div></>}
      </>)}
    </div>
  </div>;
});

// ─── Panels ──────────────────────────────

function Stats({tasks,autos,reviews}){
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

function AutoPanel({autos,onTog,onView}){
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
            <button type="button" data-oc-action={`AUTO_TOGGLE_${a.id}`} onClick={(e)=>{e.stopPropagation();e.preventDefault();onTog?.(a.id);}} style={{width:40,height:21,borderRadius:11,border:"none",background:a.active?C.green:"rgba(255,255,255,0.07)",position:"relative",cursor:"pointer",transition:"background .2s"}}>
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
        return <Card key={r.id} oc={`REVIEW_CARD_${r.id}`} glow={r.pri==="critical"?C.red:undefined}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}}>
              <span style={{fontSize:13}}>{typI[r.type]}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
            </div>
            <Badge c={pc.c} bg={pc.bg}>{pc.l}</Badge>
          </div>
          <p style={{fontSize:12,color:C.t2,margin:"0 0 6px",lineHeight:1.4}}>{r.desc}</p>
          <div role="button" tabIndex={0} data-oc-action={`REVIEW_VIEW_${r.id}`} onClick={(e)=>{e.stopPropagation();onView?.(r);}} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onView?.(r);}}} style={{background:C.indigoG,borderRadius:7,padding:"6px 10px",marginBottom:8,cursor:"pointer",fontSize:11,color:C.t3,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            💭 {r.reasoning}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:C.t3}}>{r.src} · {r.date}</span>
            <div style={{display:"flex",gap:5}}>
              <Btn oc={`REVIEW_REJECT_${r.id}`} size="md" v="no" onClick={()=>onNo(r.id)}>✕ 駁回</Btn>
              <Btn oc={`REVIEW_APPROVE_${r.id}`} size="md" v="ok" onClick={()=>onOk(r.id)}>✓ 批准</Btn>
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

function TaskBoard({tasks,onProg,onView,onRun,onDelete,runningTaskId,taskRunLog}){
  const cols=[{k:"queued",l:"排隊中",i:"📋",c:C.t3},{k:"in_progress",l:"進行中",i:"🔄",c:C.indigo},{k:"done",l:"完成",i:"✅",c:C.green}];
  const catC={
    bugfix:{l:"修復",c:C.red},
    learn:{l:"學習",c:C.purple},
    feature:{l:"功能",c:C.indigo},
    improve:{l:"改進",c:C.green},
  };
  // 安全防呆：後端若新增了未知的任務分類，避免 cc 為 undefined 造成 runtime error
  const resolveCat = (cat) => catC[cat] ?? { l: cat || "其他", c: C.t3 };
  const isRunning = (tid) => runningTaskId === tid || (taskRunLog[tid] && taskRunLog[tid].length > 0);
  return <Sec icon="📊" title="任務看板" count={tasks.length}>
    <div className="oc-task-board" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(180px,1fr))",gap:8}}>
      {cols.map(col=>{const ct=tasks.filter(t=>t.status===col.k);
        return <div key={col.k}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8,padding:"6px 9px",background:"rgba(255,255,255,0.02)",borderRadius:8,borderBottom:`2px solid ${col.c}`}}>
            <span style={{fontSize:12}}>{col.i}</span>
            <span style={{fontSize:12,fontWeight:600,color:col.c}}>{col.l}</span>
            <span style={{marginLeft:"auto",fontSize:10,color:C.t3}}>{ct.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,minHeight:70}}>
            {ct.map(t=>{const cc=resolveCat(t.cat);
              return <Card key={t.id} oc={`TASK_CARD_${t.id}`}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <Badge c={cc.c} bg={cc.c+"15"}>{cc.l}</Badge>
                  {t.status!=="done"?<div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ring pct={t.progress} size={32} stroke={2.5}/>
                    <span style={{position:"absolute",fontSize:8,fontWeight:700,color:C.t2}}>{t.progress}%</span>
                  </div>:<span style={{fontSize:14}}>✅</span>}
                </div>
                <div style={{fontSize:12.5,fontWeight:600,color:C.t1,marginBottom:6}}>{t.title}</div>
                <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:6}}>
                  {(t.subs||[]).map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <span style={{width:13,height:13,borderRadius:3,border:s.d?"none":`1.5px solid ${C.t3}`,background:s.d?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",flexShrink:0}}>{s.d&&"✓"}</span>
                    <span style={{color:s.d?C.t3:C.t2,textDecoration:s.d?"line-through":"none"}}>{s.t}</span>
                  </div>)}
                </div>
                <div role="button" tabIndex={0} data-oc-action={`TASK_VIEW_${t.id}`} onClick={(e)=>{e.stopPropagation();onView?.(t);}} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onView?.(t);}}} style={{background:"rgba(99,102,241,0.03)",borderRadius:6,padding:"5px 8px",marginBottom:6,cursor:"pointer",fontSize:10.5,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💭 {t.thought}</div>
                {isRunning(t.id) && <div style={{background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,padding:8,marginBottom:6,fontSize:10,color:C.t2,fontFamily:"'JetBrains Mono',monospace",maxHeight:80,overflowY:"auto"}}><div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}><Pulse c={C.indigo} s={5}/><span style={{color:C.indigo,fontWeight:600}}>執行中</span></div>{(taskRunLog&&taskRunLog[t.id])?.slice(-8).map((line,i)=><div key={i} style={{marginBottom:2}}>{line}</div>)||null}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {t.auto?<Badge c={C.indigo} bg={C.indigoG}>⚡ 自動</Badge>:null}
                    {t.status==="queued"&&onRun&&<Btn oc={`TASK_RUN_${t.id}`} size="md" v="pri" onClick={()=>onRun(t.id)}>▶ 執行</Btn>}
                    {t.status==="in_progress"&&t.auto&&<Btn oc={`TASK_PROGRESS_${t.id}`} size="md" v="pri" onClick={()=>onProg(t.id)}>▶ 推進</Btn>}
                  </div>
                  {onDelete&&<Btn oc={`TASK_DELETE_${t.id}`} size="sm" v="no" onClick={()=>{if(confirm("確定要刪除此任務？此動作無法復原。"))onDelete(t.id);}}>🗑 刪除</Btn>}
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
  return <Sec icon="🔌" title="API 端點" count={API_ENDPOINTS.length} right={<Badge c={C.cyan} bg={C.cyanG}>REST + Webhook · 儲存於 Supabase</Badge>}>
    <div style={{fontSize:11,color:C.t2,marginBottom:12,lineHeight:1.5}}>
      <strong style={{color:C.t1}}>API 名稱</strong> · <strong style={{color:C.t1}}>驗證方式</strong>（誰能呼叫）· <strong style={{color:C.t1}}>儲存位置</strong>（資料寫入哪張表）
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {API_ENDPOINTS.map((e,i)=><Card key={i}>
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

// ─── 重啟 Gateway 按鈕 ─────────────────
function ResetGatewayBtn(){
  const[loading,setLoading]=useState(false);
  const[ok,setOk]=useState(false);
  const restart=useCallback(async()=>{
    setLoading(true);setOk(false);
    try {
      const r=await fetch(apiUrl("/api/openclaw/restart-gateway"),{method:"POST",headers:{"Content-Type":"application/json"}});
      const j=await r.json();
      setOk(j.ok===true);
      if(!j.ok){console.warn("[OpenClaw] restart gateway failed",j);toast.error("重啟 Gateway 失敗："+(j.error||"未知錯誤"));}
      else{toast.success("✓ Gateway 已重啟（port 18789）");setTimeout(()=>setOk(false),2500);}
    }catch(e){console.warn("[OpenClaw] restart gateway failed",e);toast.error("無法連線到 Gateway API");}
    setLoading(false);
  },[]);
  return <button type="button" data-oc-action="BTN_RESET_GATEWAY" onClick={restart} disabled={loading} style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${ok?C.green:C.border}`,background:ok?C.greenG:"transparent",color:ok?C.green:C.t2,fontSize:11,fontWeight:600,cursor:loading?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"all .2s"}} title="點擊後自動於背景重啟 OpenClaw Gateway (port 18789)">{loading?"⏳ 重啟中…":ok?"✓ 已重啟":"↻ Reset Gateway"}</button>;
}

// ─── API  helpers（Supabase 寫入）───
// 有 VITE_API_BASE_URL 用該網址；否則開發時 fallback 到 3060（與 .env 一致）
const _env = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim?.();
const _dev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
const API_BASE = _env ? _env.replace(/\/$/, "") : (_dev ? "http://localhost:3060" : "");

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path.startsWith("/") ? path : "/" + path}` : path.startsWith("/") ? path : "/" + path;
}

/** WebSocket 網址（與 REST API 同 host，path /ws/tasks） */
function wsTaskUrl() {
  if (!API_BASE) return null;
  const base = API_BASE.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
  return `${base}/ws/tasks`;
}

const FETCH_TIMEOUT_MS = 25000;
const FETCH_RETRIES = 2;

async function fetchWithRetry(path, signal) {
  const url = apiUrl(path);
  for (let i = 0; i <= FETCH_RETRIES; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      if (signal?.aborted) return null;
      if (i === FETCH_RETRIES) {
        console.warn("[OpenClaw] API 請求失敗:", path, e);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

async function fetchOpenClaw(path, signal) {
  try {
    return await fetchWithRetry(path, signal);
  } catch (e) {
    console.warn("[OpenClaw] API 請求失敗:", path, e);
    return null;
  }
}
async function persistTask(task){try{await fetch(apiUrl("/api/openclaw/tasks"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...task,fromR:task.fromR})});}catch(e){console.warn("[OpenClaw] persist task failed",e);}}
async function persistReview(review){try{await fetch(apiUrl("/api/openclaw/reviews"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...review,desc:review.desc})});}catch(e){console.warn("[OpenClaw] persist review failed",e);}}
async function persistAutomation(auto){try{await fetch(apiUrl("/api/openclaw/automations"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auto,lastRun:auto.lastRun||auto.last_run})});}catch(e){console.warn("[OpenClaw] persist automation failed",e);}}
async function persistEvo(e){try{await fetch(apiUrl("/api/openclaw/evolution-log"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});}catch(err){console.warn("[OpenClaw] persist evo failed",err);}}

// ─── Main App ────────────────────────────

export default function OpenClawV4(){
  const[autos,setAutos]=useState(AUTOS);
  const[reviews,setReviews]=useState(REVIEWS);
  const[tasks,setTasks]=useState(TASKS);
  const[tab,setTab]=useState("all");
  const[drawer,setDrawer]=useState(null);
  const now=new Date();

  const hasLocalUpdate = useRef(false);
  const[apiOnline,setApiOnline]=useState(null); // null=unknown, true=ok, false=offline
  // 從 Supabase（經後端 API）載入，含 cleanup 避免 unmount 後 setState
  // 僅在初次載入時覆寫；使用者操作後不再用 API 資料覆蓋
  useEffect(()=>{
    const ac = new AbortController();
    let mounted = true;
    (async()=>{
      const [tList,rList,aList,evoList]=await Promise.all([
        fetchOpenClaw("/api/openclaw/tasks", ac.signal),
        fetchOpenClaw("/api/openclaw/reviews", ac.signal),
        fetchOpenClaw("/api/openclaw/automations", ac.signal),
        fetchOpenClaw("/api/openclaw/evolution-log", ac.signal)
      ]);
      if (mounted) setApiOnline(tList!==null||rList!==null);
      if (!mounted || hasLocalUpdate.current) return;
      if(Array.isArray(tList)&&tList.length>0)setTasks(tList.map(t=>({...t,subs:t.subs||[],fromR:t.from_review_id||t.fromR})));
      if(Array.isArray(rList)&&rList.length>0)setReviews(rList);
      if(Array.isArray(aList)&&aList.length>0)setAutos(aList.map(a=>({...a,chain:a.chain||[],lastRun:a.last_run||a.lastRun})));
      if(Array.isArray(evoList)&&evoList.length>0)setEvo(evoList.map(e=>({...e,t:e.t||"",x:e.x||"",c:e.c||C.t2,tag:e.tag,tc:e.tc||C.t2})));
    })();
    return ()=>{ mounted = false; ac.abort(); };
  },[]);

  // WebSocket 連線 - 即時接收任務進度更新
  const wsRef = useRef(null);
  useEffect(()=>{
    const wsUrl = API_BASE ? API_BASE.replace(/^http/, 'ws') + '/ws/tasks' : 'ws://localhost:3001/ws/tasks';
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => console.log('[WebSocket] 已連線');
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'progress' && data.taskId) {
            // 更新對應任務的進度
            setTasks(p => p.map(t => {
              if (t.id !== data.taskId) return t;
              return {
                ...t,
                progress: data.progress ?? t.progress,
                status: data.status === 'success' ? 'done' : data.status === 'running' ? 'in_progress' : t.status,
                thought: data.message || t.thought
              };
            }));
            // 如果有完成訊息，加入進化紀錄
            if (data.status === 'success' || data.status === 'failed') {
              addE(`任務進度 [${data.taskId}]: ${data.progress}% - ${data.message || data.status}`, 
                data.status === 'success' ? C.green : C.red,
                data.status === 'success' ? '完成' : '錯誤',
                data.status === 'success' ? C.green : C.red
              );
            }
          }
        } catch (err) {
          console.warn('[WebSocket] 解析訊息失敗:', err);
        }
      };
      ws.onerror = (e) => console.warn('[WebSocket] 連線錯誤:', e);
      ws.onclose = () => console.log('[WebSocket] 已斷線');
    } catch (e) {
      console.warn('[WebSocket] 無法建立連線:', e);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addE]);

  const[evo,setEvo]=useState([
    {t:"14:30",x:"推進「WebSocket 重連修復」— 指數退避完成 → 65%",c:C.indigo,tag:"自動執行",tc:C.indigo},
    {t:"12:00",x:"偵測 Bun v1.2 → 自動建立審核項目",c:C.amber,tag:"發現",tc:C.amber},
    {t:"09:15",x:"掃描發現 Worker Thread 記憶體洩漏 → 提交審核",c:C.red,tag:"問題",tc:C.red},
    {t:"08:00",x:"CI/CD 加速完成：12min → 3.8min（-68%）",c:C.green,tag:"完成",tc:C.green},
    {t:"昨日",x:"知識庫發現 Drizzle ORM → 建立學習計畫",c:C.purple,tag:"學習",tc:C.purple},
  ]);

  const addE=useCallback((x,c,tag,tc)=>{hasLocalUpdate.current=true;const e={t:new Date().toTimeString().slice(0,5),x,c,tag,tc};setEvo(p=>[e,...p]);persistEvo(e);},[]);
  const lastTogRef=useRef(0);
  const togA=useCallback(id=>{const nowT=Date.now();if(nowT-lastTogRef.current<400)return;lastTogRef.current=nowT;hasLocalUpdate.current=true;setAutos(p=>p.map(a=>{if(a.id!==id)return a;const upd={...a,active:!a.active};persistAutomation(upd);return upd;}));},[]);

  const lastReviewRef=useRef({ts:0,id:null});
  const okR=useCallback(id=>{const now=Date.now();if(now-lastReviewRef.current.ts<300&&lastReviewRef.current.id===id)return;lastReviewRef.current={ts:now,id};hasLocalUpdate.current=true;const r=reviews.find(r=>r.id===id);const upd={...r,status:"approved"};setReviews(p=>p.map(r=>r.id===id?upd:r));
    if(r){addE(`審核通過「${r.title}」→ 排入執行`,C.green,"批准",C.green);persistReview(upd);}},[reviews,addE]);
  const noR=useCallback(id=>{const now=Date.now();if(now-lastReviewRef.current.ts<300&&lastReviewRef.current.id===id)return;lastReviewRef.current={ts:now,id};hasLocalUpdate.current=true;const r=reviews.find(r=>r.id===id);const upd={...r,status:"rejected"};setReviews(p=>p.map(r=>r.id===id?upd:r));
    if(r){addE(`駁回「${r.title}」`,C.t3,"駁回",C.t3);persistReview(upd);}},[reviews,addE]);

  const handleDrawerSave=useCallback((updated)=>{
    hasLocalUpdate.current=true;
    if(Array.isArray(updated.subs)){setTasks(p=>p.map(t=>t.id===updated.id?updated:t));persistTask(updated);}
    else if(Array.isArray(updated.chain)&&updated.cron!==undefined){setAutos(p=>p.map(a=>a.id===updated.id?updated:a));persistAutomation(updated);}
    else{setReviews(p=>p.map(r=>r.id===updated.id?updated:r));persistReview(updated);}
  },[]);

  const progT=useCallback(async id=>{const now=Date.now();if(now-lastActionRef.current.ts<300&&lastActionRef.current.id===id)return;lastActionRef.current={ts:now,id};hasLocalUpdate.current=true;
    const t=tasks.find(x=>x.id===id);if(!t)return;
    const ni=t.subs.findIndex(s=>!s.d);if(ni===-1)return;
    const ns=t.subs.map((s,i)=>i===ni?{...s,d:true}:s);
    const np=Math.round((ns.filter(s=>s.d).length/ns.length)*100), ad=ns.every(s=>s.d);
    const message=ad?"✅ 完成！":`執行中：${ns[ni+1]?.t||"收尾"}...`;
    try {
      await fetch(apiUrl(`/api/tasks/${id}/progress`),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({progress:np,message,status:ad?"success":undefined})});
    }catch(e){console.warn("[OpenClaw] progress API failed",e);}
    setTasks(p=>p.map(x=>{
      if(x.id!==id)return x;
      const upd={...x,subs:ns,progress:np,status:ad?"done":x.status,thought:message};
      persistTask(upd);addE(`推進「${x.title}」— 完成「${t.subs[ni].t}」→ ${np}%${ad?" ✅":""}`,ad?C.green:C.indigo,ad?"完成":"推進",ad?C.green:C.indigo);
      return upd;
    }));
  },[tasks,addE]);

  const lastActionRef=useRef({ts:0,id:null});
  const [runningTaskId,setRunningTaskId]=useState(null);
  const [taskRunLog,setTaskRunLog]=useState(()=>({}));

  const runT=useCallback(async id=>{const now=Date.now();if(now-lastActionRef.current.ts<300&&lastActionRef.current.id===id)return;lastActionRef.current={ts:now,id};hasLocalUpdate.current=true;
    const t=tasks.find(x=>x.id===id);
    setTasks(p=>p.map(x=>x.id===id?{...x,status:"in_progress",thought:"執行中..."}:x));
    setRunningTaskId(id);setTaskRunLog(prev=>({...prev,[id]:[]}));
    addE(`執行「${t?.title||id}」`,C.indigo,"執行",C.indigo);
    try {
      const r=await fetch(apiUrl(`/api/openclaw/tasks/${id}/run`),{method:"POST",headers:{"Content-Type":"application/json"}});
      const run=await r.json().catch(()=>({}));
      const runId=run.runId||run.id;
      setTasks(p=>p.map(x=>x.id===id?{...x,thought:runId?`執行中：Run ${runId}…`:run.error?`失敗：${run.error}`:"執行中…"}:x));
      if(runId) persistTask({...t,status:"in_progress",thought:`執行中：Run ${runId}…`});
      if(!r.ok||run.error) { toast.error(run.error||"執行任務失敗"); setRunningTaskId(prev=>prev===id?null:prev); }
    }catch(e){console.warn("[OpenClaw] run task failed",e);toast.error("無法連線到後端 API");setRunningTaskId(prev=>prev===id?null:prev);}
  },[tasks,addE]);

  // WebSocket：接收任務進度即時更新
  useEffect(() => {
    const url = wsTaskUrl();
    if (!url) return;
    let ws = null;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type !== "progress" || !data.taskId) return;
          const id = data.taskId;
          setTasks((p) => p.map((x) => x.id !== id ? x : { ...x, progress: data.progress ?? x.progress, thought: data.message ?? x.thought, status: data.status === "success" ? "done" : data.status === "failed" ? "in_progress" : x.status }));
          setTaskRunLog((prev) => ({ ...prev, [id]: [...(prev[id] || []), ...(Array.isArray(data.log) ? data.log : [data.message].filter(Boolean))].slice(-50) }));
          if (data.status === "success" || data.status === "failed") setRunningTaskId((cur) => (cur === id ? null : cur));
        } catch (_) {}
      };
      ws.onclose = () => {};
      ws.onerror = () => {};
    } catch (e) {
      console.warn("[OpenClaw] WebSocket connect failed", e);
    }
    return () => { try { if (ws && ws.readyState === 1) ws.close(); } catch (_) {} };
  }, []);

  const delT=useCallback(async id=>{const now=Date.now();if(now-lastActionRef.current.ts<300&&lastActionRef.current.id===id)return;lastActionRef.current={ts:now,id};hasLocalUpdate.current=true;
    const t=tasks.find(x=>x.id===id);
    setTasks(p=>p.filter(x=>x.id!==id));
    addE(`已刪除「${t?.title||id}」`,C.t3,"刪除",C.t3);
    try {
      const r=await fetch(apiUrl(`/api/openclaw/tasks/${id}`),{method:"DELETE"});
      if(!r.ok){ if(t)setTasks(p=>[...p,t]); toast.error("刪除失敗，請確認後端 API 與 Supabase 已連線"); }
    }catch(e){ if(t)setTasks(p=>[...p,t]); toast.error("刪除失敗，無法連線後端 API"); console.warn("[OpenClaw] delete task failed",e); }
  },[tasks,addE]);

  const tabs=[
    {k:"all",l:"總覽"},{k:"auto",l:"⚡ 自動化"},{k:"review",l:"🔍 審核"},{k:"tasks",l:"📊 任務"},
    {k:"n8n",l:"🔗 n8n"},{k:"api",l:"🔌 API"},{k:"security",l:"🛡️ 安全"},{k:"plugins",l:"🧩 Plugin"},{k:"evo",l:"🧬 進化"},
  ];

  const renderTab=()=>{
    if(tab==="all") return <>
      <Stats tasks={tasks} autos={autos} reviews={reviews}/>
      <div className="oc-grid-all" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:20}}>
        <div style={{minWidth:0}}><AutoPanel autos={autos} onTog={togA} onView={setDrawer}/><ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onView={setDrawer}/><N8nPanel/></div>
        <div style={{minWidth:0}}><TaskBoard tasks={tasks} onProg={progT} onView={setDrawer} onRun={runT} onDelete={delT} runningTaskId={runningTaskId} taskRunLog={taskRunLog}/><SecurityPanel/><PluginPanel/><EvoPanel log={evo}/></div>
      </div>
    </>;
    if(tab==="auto") return <div style={{maxWidth:680}}><AutoPanel autos={autos} onTog={togA} onView={setDrawer}/></div>;
    if(tab==="review") return <div style={{maxWidth:680}}><ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onView={setDrawer}/></div>;
    if(tab==="tasks") return <><Stats tasks={tasks} autos={autos} reviews={reviews}/><TaskBoard tasks={tasks} onProg={progT} onView={setDrawer} onRun={runT} onDelete={delT} runningTaskId={runningTaskId} taskRunLog={taskRunLog}/></>;
    if(tab==="n8n") return <div style={{maxWidth:720}}><N8nPanel/></div>;
    if(tab==="api") return <div style={{maxWidth:800}}><ApiPanel/></div>;
    if(tab==="security") return <div style={{maxWidth:800}}><SecurityPanel/></div>;
    if(tab==="plugins") return <div style={{maxWidth:720}}><PluginPanel/></div>;
    return <div style={{maxWidth:680}}><EvoPanel log={evo}/></div>;
  };

  return <div style={{minHeight:"100vh",width:"100%",maxWidth:"100%",minWidth:0,overflowX:"hidden",boxSizing:"border-box",background:C.bg,color:C.t1,fontFamily:"'Geist','SF Pro Display',-apple-system,sans-serif"}}>
    <style>{`
      @keyframes oc-p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(2)}}
      @keyframes oc-fi{from{opacity:0}to{opacity:1}}
      @keyframes oc-sl{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes oc-su{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box}
      @media (max-width:900px){.oc-grid-all{grid-template-columns:1fr!important}}
      @media (max-width:768px){
        .oc-task-board{grid-template-columns:1fr!important}
        .oc-header{flex-direction:column;align-items:flex-start!important}
        .oc-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}
      }
      *{scrollbar-width:thin;scrollbar-color:#1a1a24 transparent}
      ::-webkit-scrollbar{width:6px;height:6px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:#1a1a24;border-radius:3px}
      ::-webkit-scrollbar-thumb:hover{background:#2a2a34}
      ::placeholder{color:${C.t3}}
      button:focus-visible{outline:2px solid ${C.indigo};outline-offset:2px}
    `}</style>

    {/* Header */}
    <div className="oc-header" style={{padding:"14px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,background:"rgba(6,6,10,0.9)",backdropFilter:"blur(14px)",position:"sticky",top:0,zIndex:100}}>
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
          <Pulse c={apiOnline===false?C.red:C.green}/><span style={{fontSize:11,color:apiOnline===false?C.red:C.green,fontWeight:500}}>{apiOnline===false?"API 離線":"Online"}</span>
        </div>
        <div style={{fontSize:10,color:C.t3}} title={apiOnline===false?"請確認後端已啟動：npm run dev:server" : undefined}>API: {API_BASE?(API_BASE.replace(/^https?:\/\//,"").split("/")[0]):"同源 proxy"}</div>
        <ResetGatewayBtn/>
      </div>
    </div>

    {/* Tabs */}
    <div className="oc-tabs" style={{padding:"8px 24px",display:"flex",gap:2,borderBottom:`1px solid rgba(255,255,255,0.02)`,background:"rgba(6,6,10,0.5)",overflowX:"auto"}}>
      {tabs.map(t=><button type="button" key={t.k} data-oc-action={`TAB_${t.k.toUpperCase()}`} onClick={()=>setTab(t.k)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:tab===t.k?"rgba(255,255,255,0.06)":"transparent",color:tab===t.k?C.t1:C.t3,fontSize:12,fontWeight:tab===t.k?600:500,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",fontFamily:"inherit"}}>{t.l}</button>)}
    </div>

    {/* Content */}
    <div style={{padding:"16px 20px",maxWidth:1440,width:"100%",margin:"0 auto",animation:"oc-su .2s ease"}} key={tab}>
      {renderTab()}
    </div>

    {drawer&&<Drawer item={drawer} onClose={()=>setDrawer(null)} onSave={handleDrawerSave}/>}
  </div>;
}
