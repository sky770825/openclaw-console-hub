export const AUTOS_SEED = [
  { id:"a1", name:"每日程式碼掃描", cron:"0 8 * * *", active:true, chain:["Scan Repo","Detect CVE","Report","Notify TG"], health:98, runs:142, lastRun:"08:00" },
  { id:"a2", name:"依賴套件更新", cron:"0 9 * * 1", active:true, chain:["Check deps","CVE match","Create PR"], health:100, runs:24, lastRun:"09:00 Mon" },
  { id:"a3", name:"效能基準測試", cron:"0 22 * * *", active:false, chain:["Load test","Log P95","Compare"], health:87, runs:89, lastRun:"22:00 昨" },
  { id:"a4", name:"知識庫掃描", cron:"0 */6 * * *", active:true, chain:["Scan radar","Score relevance","Create review"], health:95, runs:311, lastRun:"14:00" },
];

export const REVIEWS_SEED = [
  { id:"r1", title:"Bun v1.2 Runtime 遷移", type:"tool", desc:"冷啟動 3x 提升", src:"技術雷達", pri:"high", status:"approved", date:"02-09", reasoning:"偵測到 Bun v1.2 發布。對比 Node.js 18：冷啟動 320ms→95ms、HTTP throughput +47%。遷移風險中等（6/10），需驗證 native addon 相容性。建議先在 staging PoC。" },
  { id:"r2", title:"Worker Thread 記憶體洩漏", type:"issue", desc:"高併發下記憶體異常增長", src:"自動監控", pri:"critical", status:"approved", date:"02-09", reasoning:"監控偵測 Worker Pool >500 req/s 時記憶體線性增長 ~12MB/min。Heap snapshot 定位到 EventEmitter listener 未解綁（callback 閉包持有 Buffer ref）。需 hotfix。" },
  { id:"r4", title:"WebSocket 指數退避", type:"issue", desc:"避免重連雪崩", src:"日誌分析", pri:"high", status:"approved", date:"02-07", reasoning:"斷線後同時重連造成伺服器過載。設計 exponential backoff + jitter 方案。" },
  { id:"r5", title:"Drizzle ORM", type:"learn", desc:"TS 原生 ORM，效能 2.4x Prisma", src:"知識庫", pri:"medium", status:"approved", date:"02-06", reasoning:"Drizzle 完全 edge-compatible、查詢效能高、型別安全。值得投入學習。" },
];

export const TASKS_SEED = [
  { id:"t1", title:"修復 WebSocket 重連雪崩", cat:"bugfix", status:"in_progress", progress:65, auto:true, fromR:"r4", subs:[{t:"分析重連邏輯",d:true},{t:"指數退避演算法",d:true},{t:"壓力測試",d:false},{t:"部署 staging",d:false}], thought:"壓力測試中：1000 連線同時斷線，觀察 CPU/RAM 變化..." },
  { id:"t2", title:"學習 Drizzle ORM", cat:"learn", status:"in_progress", progress:30, auto:false, fromR:"r5", subs:[{t:"官方文件",d:true},{t:"PoC 專案",d:false},{t:"效能對比",d:false},{t:"遷移方案",d:false}], thought:"文件閱讀完成。下一步：SQLite PoC 後切 Postgres。" },
  { id:"t3", title:"API 快取層", cat:"feature", status:"queued", progress:0, auto:true, subs:[{t:"需求分析",d:false},{t:"Redis vs Memcached",d:false},{t:"架構文件",d:false},{t:"實作測試",d:false}], thought:"排隊中，WebSocket 修復後啟動。" },
  { id:"t4", title:"CI/CD 加速", cat:"improve", status:"done", progress:100, auto:true, subs:[{t:"瓶頸分析",d:true},{t:"平行建置",d:true},{t:"快取 modules",d:true},{t:"驗證成效",d:true}], thought:"✅ 建置 12min → 3.8min（-68%）" },
];

// 以下由 GET /api/openclaw/board-config 提供，此處僅作 fallback（API 失敗時）
export const FALLBACK_N8N = [
  { id:"n1", name:"OpenClaw Agent → Supabase Sync", status:"active", trigger:"Webhook", nodes:8, execs:1247, lastExec:"2 min ago", desc:"接收 OpenClaw 任務結果，寫入 Supabase tasks/reviews 表，觸發 Telegram 通知" },
  { id:"n2", name:"Telegram → 審核指令路由", status:"active", trigger:"Telegram Trigger", nodes:12, execs:89, lastExec:"15 min ago", desc:"解析 /approve /reject /status 指令，更新 Supabase 審核狀態，回傳結果" },
  { id:"n3", name:"排程自動化執行器", status:"active", trigger:"Cron", nodes:6, execs:432, lastExec:"08:00", desc:"依據 automations 表的 cron 設定，觸發對應的掃描/測試流程" },
  { id:"n4", name:"告警推送 Pipeline", status:"active", trigger:"Supabase Realtime", nodes:5, execs:34, lastExec:"09:15", desc:"監聽 critical 等級審核項目，即時推送 Telegram + Email 告警" },
  { id:"n5", name:"API Rate Limiter", status:"draft", trigger:"Webhook", nodes:4, execs:0, lastExec:"—", desc:"對外部 API 呼叫進行速率限制，防止 token 超支" },
];

export const FALLBACK_API = [
  { name:"任務列表", method:"GET", path:"/api/tasks", auth:"user+", authDesc:"登入用戶或以上（JWT）", desc:"取得任務列表", rateLimit:"100/min", status:"live", storage:"Supabase · tasks" },
  { name:"建立任務", method:"POST", path:"/api/tasks", auth:"admin", authDesc:"管理員（JWT role=admin）", desc:"建立新任務", rateLimit:"30/min", status:"live", storage:"Supabase · tasks" },
  { name:"審核列表", method:"GET", path:"/api/reviews", auth:"user+", authDesc:"登入用戶或以上（JWT）", desc:"取得待審核/已批准項目", rateLimit:"100/min", status:"live", storage:"Supabase · reviews" },
  { name:"OpenClaw Webhook", method:"POST", path:"/api/webhook/openclaw", auth:"api_key", authDesc:"X-API-Key 或 Bearer", desc:"n8n 接收 Agent 結果後呼叫", rateLimit:"200/min", status:"live", storage:"Supabase · tasks, reviews" },
];

export const FALLBACK_SECURITY = [
  { id:"s1", name:"Supabase Auth + JWT", status:"active", detail:"JWT 自動附帶 role claim", icon:"🔐" },
  { id:"s2", name:"RLS 資料庫層防護", status:"active", detail:"Row Level Security", icon:"🛡️" },
  { id:"s3", name:"RBAC 角色權限", status:"active", detail:"admin / user / agent", icon:"👤" },
];

export const FALLBACK_RBAC = [
  { resource:"tasks", admin:"CRUD", user:"R", agent:"RU" },
  { resource:"reviews", admin:"CRUD", user:"R", agent:"CR" },
  { resource:"evolution_log", admin:"CRUD", user:"R", agent:"C" },
];

export const FALLBACK_PLUGINS = [
  { id:"p1", name:"GitHub Scanner", status:"active", desc:"掃描 Repo issue / PR / CVE", icon:"🐙", calls:1247 },
  { id:"p2", name:"Telegram Bridge", status:"active", desc:"雙向指令 + 通知推送", icon:"✈️", calls:892 },
  { id:"p6", name:"Custom Tool (可擴充)", status:"template", desc:"你的下一個 Plugin...", icon:"🧩", calls:0 },
];
