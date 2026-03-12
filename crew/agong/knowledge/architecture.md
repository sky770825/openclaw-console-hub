# 阿工專屬 — OpenClaw 系統架構速覽
> 你是阿工（🔧 工程師），不是小蔡，這是你的專屬知識庫

---

## 系統總覽

```
┌─────────────────────────────────────────────────┐
│                  使用者 / Telegram                │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│            Express.js Server (port 3011)         │
│                  server/src/index.ts              │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ API 路由  │ │ 中間件    │ │ Auto Executor   │ │
│  │ /api/*   │ │ auth/cors │ │ 自動任務執行      │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Supabase (PostgreSQL + pgvector)     │
│              向量知識庫 + 任務資料庫               │
└─────────────────────────────────────────────────┘
```

---

## Server 目錄結構

```
server/src/
├── index.ts              ← 主入口（路由註冊、中間件、API 定義）
├── routes/               ← 路由模組
│   ├── auto-executor.ts  ← 自動執行器 API
│   ├── federation.ts     ← FADP 聯盟協防
│   ├── insights.ts       ← 數據分析 API
│   ├── memory.ts         ← 記憶管理 API
│   ├── openclaw-data.ts  ← OpenClaw 核心數據
│   ├── openclaw-reviews.ts ← 審核系統
│   ├── openclaw-runs.ts  ← 執行紀錄
│   ├── openclaw-tasks.ts ← 任務管理
│   ├── projects.ts       ← 專案管理
│   ├── property-api.ts   ← 房產工具 API
│   ├── proxy.ts          ← AI 代理轉發
│   └── tasks.ts          ← 基本任務 CRUD
├── services/             ← 業務邏輯層
├── middlewares/           ← 中間件（auth、CORS、rate limit）
├── telegram/             ← Telegram Bot 相關
├── validation/           ← 請求驗證（Zod schema）
├── utils/                ← 工具函數
├── supabase.ts           ← Supabase 客戶端
├── openclawSupabase.ts   ← OpenClaw 專用 Supabase 操作
├── store.ts              ← 記憶體狀態管理
├── websocket.ts          ← WebSocket 即時通訊
├── workflow-engine.ts    ← 工作流引擎
├── n8nClient.ts          ← n8n 整合客戶端
├── logger.ts             ← 日誌系統
├── error-handler.ts      ← 全域錯誤處理
├── promptGuard.ts        ← Prompt 注入防護
├── riskClassifier.ts     ← 風險分類器
├── governanceEngine.ts   ← 治理引擎
└── anti-stuck.ts         ← 防卡機制
```

---

## API 路由總表

### 主要路由掛載（index.ts）

| 路徑 | Router | 用途 |
|------|--------|------|
| `/api/tasks` | tasksRouter | 基本任務 CRUD |
| `/api/openclaw/projects` | projectsRouter | 專案管理 |
| `/api/openclaw` | autoExecutorRouter | 自動執行器 |
| `/api/openclaw` | memoryRouter | 記憶管理 |
| `/api/openclaw/tasks` | openclawTasksRouter | OpenClaw 任務 |
| `/api/openclaw/reviews` | openclawReviewsRouter | 審核系統 |
| `/api/openclaw` | openclawDataRouter | 核心數據 |
| `/api/openclaw/insights` | insightsRouter | 數據分析 |
| `/api/tools` | propertyApiRouter | 房產工具 |
| `/api/proxy` | proxyRouter | AI 代理轉發 |
| `/api/federation` | federationRouter | FADP 聯盟 |

### 常用 API 端點

| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/tasks` | 取得任務列表 |
| POST | `/api/tasks` | 建立任務 |
| POST | `/api/openclaw/tasks/:id/run` | 執行任務 |
| POST | `/api/openclaw/run-next` | 執行下一個待處理任務 |
| POST | `/api/openclaw/command` | 發送指令 |
| POST | `/api/openclaw/red-alert` | 紅色警報 |
| POST | `/api/openclaw/proposal` | 提案 |
| GET | `/api/openclaw/sessions/:id` | 取得會話 |
| GET | `/api/runs` | 執行紀錄列表 |
| GET | `/api/alerts` | 告警列表 |
| GET | `/api/domains` | 網域列表 |
| GET | `/api/features` | 功能清單 |

### 認證方式
所有 `/api/*` 需要 Bearer token：
```
Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1
```

---

## 中間件堆疊順序（index.ts）

```
1. cors()              ← 跨域設定
2. helmet()            ← 安全 headers
3. express-rate-limit  ← 請求限速
4. express.json()      ← JSON body 解析（limit: 200kb）
5. federationBlocker   ← 聯盟封鎖
6. postMessageFirewall ← 訊息防火牆
7. authMiddleware      ← API Key 認證（/api/* 路徑）
8. 各路由 handler
```

---

## Supabase 資料庫

### 主要資料表

| 表名 | 用途 | 關鍵欄位 |
|------|------|---------|
| `openclaw_tasks` | 任務 | id, name, status, priority, owner, deck |
| `openclaw_reviews` | 審核 | id, task_id, status, reviewer |
| `openclaw_runs` | 執行紀錄 | id, task_id, status, started_at, finished_at |
| `openclaw_projects` | 專案 | id, name, description |
| `openclaw_knowledge` | 向量知識庫 | id, content, embedding, metadata, chunk_index |
| `openclaw_sessions` | 會話 | id, commands, interrupts |
| `fadp_members` | 聯盟成員 | id, name, status |

### 向量知識庫表結構（openclaw_knowledge）
```sql
id: uuid
content: text          -- 文本內容
embedding: vector(768) -- gemini-embedding-001 向量
metadata: jsonb        -- { source, category, chunk_index, ... }
chunk_index: integer   -- -1=summary, >=0=detail chunk
created_at: timestamptz
```

### Supabase 客戶端
- 檔案：`server/src/supabase.ts`（基本客戶端）
- 檔案：`server/src/openclawSupabase.ts`（OpenClaw 專用操作）

---

## 部署架構

```
本地 Mac（開發 + 生產）
├── launchd: com.openclaw.taskboard
│   ├── WorkingDirectory: /Users/caijunchang/openclaw任務面版設計/server
│   ├── 啟動: node dist/index.js
│   └── KeepAlive: true（掛了自動重啟）
├── Port: 3011
└── Log: ~/.openclaw/automation/logs/taskboard.log

雲端服務
├── Supabase: PostgreSQL + pgvector（資料庫）
├── Zeabur: n8n（工作流自動化）
└── GitHub: sky770825/openclaw-console-hub（代碼倉庫）
```

### 兩個工作目錄（重要！）
| 目錄 | 用途 |
|------|------|
| `~/Downloads/openclaw-console-hub-main/` | 小蔡開發目錄（寫代碼） |
| `~/openclaw任務面版設計/` | **Server 實際執行目錄**（launchd 跑的是這個） |

改完代碼 push 後，必須在執行目錄 `git pull + npm run build`，否則 server 跑的還是舊版。

---

## 技術棧速查

| 技術 | 版本/說明 | 用途 |
|------|----------|------|
| Node.js | ESM 模組 | Runtime |
| Express.js | v4 | Web 框架 |
| TypeScript | strict mode | 型別安全 |
| React | + Vite | 前端 SPA |
| R3F | React Three Fiber | 3D 場景 |
| Supabase | PostgreSQL + pgvector | 資料庫 + 向量 |
| Telegram Bot API | bot-polling.ts | Bot 通訊 |
| launchd | macOS | 本地部署 |
| Zod | 驗證 schema | 請求驗證 |
| helmet | 安全 headers | 安全 |
| cors | 跨域 | 跨域存取 |

---

## 常用排查路徑

| 問題 | 看哪裡 |
|------|--------|
| API 回 500 | `server/src/index.ts` 對應的路由 handler |
| 認證失敗 | `server/src/middlewares/` auth 中間件 |
| 任務沒執行 | `server/src/routes/auto-executor.ts` |
| Telegram 不回 | `server/src/telegram/` |
| 向量搜尋不準 | `server/src/openclawSupabase.ts` |
| 資料存取問題 | `server/src/supabase.ts` |
| WebSocket 斷線 | `server/src/websocket.ts` |
| 限速被擋 | `server/src/index.ts` rateLimit 設定 |
