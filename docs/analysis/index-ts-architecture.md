# index.ts 程式碼架構分析

> 由 NEUXA 透過 Claude Sonnet 於 2026-02-28 產生

---

### 主要職責

1.  應用程式進入點 (Entry Point) — 初始化整個 Express 後端服務，載入環境變數 (preload-dotenv.js) 並啟動伺服器
2.  Supabase 資料整合 — 透過 openclawSupabase.js 與 Supabase 互動，同時保留本地記憶體 store (store.js) 作為備援
3.  資料格式轉換 — 透過 openclawMapper.js 在 OpenClaw 格式與內部型別之間做映射 (Task, Run, Alert)
4.  外部服務整合 — 啟動 Telegram Stop Poll (startTelegramStopPoll)
5.  API 規格實作 — 依據 docs/API-INTEGRATION.md 規格提供端點

---

### 關鍵中介軟體 (Middleware)

| 中介軟體 | 來源 | 用途 |
|---|---|---|
| helmet | 第三方 | 設定安全性 HTTP 標頭 |
| cors | 第三方 | 處理跨來源請求 |
| rateLimit | express-rate-limit | 防止 API 濫用/暴力攻擊 |
| authMiddleware | 內部自訂 | 驗證請求身份 |
| validateBody / validateParams / validateQuery | 內部自訂 | 搭配 Zod schemas 做輸入驗證 |
| federationBlockerMidd... | 內部自訂 | （程式碼截斷）推測為聯邦請求過濾 |

驗證 Schema 集中定義於 validation/schemas.js。

---

### 路由組織方式

採用模組化路由 (Router)，依功能領域拆分：

``
/api/
├── tasks/          → tasksRouter
├── projects/       → projectsRouter
├── memory/         → memoryRouter
├── insights/       → insightsRouter
├── federation/     → federationRouter
└── openclaw/
    ├── tasks/      → openclawTasksRouter
    ├── reviews/    → openclawReviewsRouter
    └── data/       → openclawDataRouter
`

---

### 此檔案在後端服務中的角色

index.ts` 是應用程式的組裝層 (Composition Root)，它本身不包含業務邏輯，而是：

-   將所有依賴（資料庫、外部服務、中介軟體、路由）組裝在一起
-   定義全局安全策略（helmet、cors、rate limit、auth）
-   確保 Supabase 連線能力並依此決定資料存取策略
-   扮演中控台與 OpenClaw 執行引擎之間的橋接閘道 (Gateway)
