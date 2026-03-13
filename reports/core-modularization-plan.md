# OpenClaw 核心模組化規劃

## 現況分析

*當前架構問題*：
- 單體 Express 應用（index.ts 147KB）
- 路由、業務邏輯、存儲混在一起
- 990 Lite 無法優雅共用核心功能
- Auto-Executor 難以獨立升級

*目標*：拆分為 6 個職責清晰的核心模組，支持 990 Lite 和未來自主執行。

---

## 核心模組架構（6 層）

``
Telegram/API ──────────────────┐
                               ↓
        Interface Gateway (介面網關)
         ↓           ↓           ↓
    User Mgmt   Core Logic   Notification
         ↓           ↓           ↓
        Data Persistence (數據層)
         ↓
      Supabase
`

### 1. Interface Gateway（介面網關）
*職責*：統一入口，平台無關
- 處理 Telegram Webhook、HTTP API 請求
- 驗證請求來源、解析原始數據
- 轉換為標準化命令格式（赫耳墨斯協議 JSON）
- 例：{"source":"telegram","userId":"123","command":"scan","payload":{...}}

*當前對應*：telegram/index.ts 的 webhook 處理

### 2. User Management（用戶管理）
*職責*：身份、權限、訂閱
- 用戶認證（Telegram ID → 內部用戶）
- 權限檢查（此用戶能用 990 Lite 嗎？）
- 訂閱狀態查詢

*當前對應*：authMiddleware + 散落的用戶邏輯

### 3. Data Persistence（數據持久化）
*職責*：唯一與 Supabase 互動的層
- 提供清晰的數據訪問 API
- user.findById(), task.create(), config.get()
- 隱藏所有 SQL 和 Supabase Client 細節

*當前對應*：openclawSupabase.ts（需擴充和規範）

### 4. Core Logic Engine（核心邏輯引擎）
*職責*：系統大腦，協調業務流程
- 接收標準化命令
- 執行業務規則（掃描邏輯、任務編排）
- *不知道 Telegram 的存在*
- 調用下層模組完成工作

*當前對應*：executor-agents.ts + workflow-engine.ts（需重構）

### 5. Action Executor（動作執行器）
*職責*：執行外部操作
- 呼叫第三方 API（交易所、掃描工具）
- 運行子流程（n8n、腳本）
- 記錄執行日誌
- *未來 Auto-Executor 的基礎*

*當前對應*：executor-agents.ts 的執行部分

### 6. Notification Service（通知服務）
*職責*：結果回饋
- 發送 Telegram 消息
- 寫入審核隊列
- 記錄演化日誌

*當前對應*：telegram/ 目錄的消息發送邏輯

---

## 實施優先級（MVP 優先）

### Phase 1（第 1-2 週）：基礎層 — Data Persistence + Core Logic
*目標*：建立核心邏輯與數據層的清晰邊界

*任務*：
1. 從 openclawSupabase.ts 提煉出 DataLayer 模組
   - 統一的 API：db.user.findById(), db.task.query() 等
   - 隱藏 Supabase 實現細節
2. 從 executor-agents.ts + workflow-engine.ts 提煉出 CoreLogic 模組
   - 接收命令 → 執行業務邏輯 → 返回結果
   - 不涉及 Telegram、HTTP 細節
3. 寫單元測試驗證兩層的獨立性

*預期成果*：
`
server/src/modules/
  ├── data-layer/
  │   ├── index.ts
  │   ├── user.ts
  │   ├── task.ts
  │   └── config.ts
  └── core-logic/
      ├── index.ts
      ├── scan-engine.ts
      └── task-orchestrator.ts
`

### Phase 2（第 3 週）：接入層 — Gateway + User Management
*目標*：Telegram/API 與核心邏輯的標準化通訊

*任務*：
1. 建立 Interface Gateway 模組
   - Telegram Webhook → 標準命令
   - HTTP API → 標準命令
2. 建立 User Management 模組
   - 用戶認證、權限檢查
3. 改造現有 Telegram 路由調用新的 Gateway

*預期成果*：
`
server/src/modules/
  ├── gateway/
  │   ├── index.ts
  │   ├── telegram-adapter.ts
  │   └── http-adapter.ts
  └── user-management/
      ├── index.ts
      └── auth.ts
`

### Phase 3（第 4 週）：通知層 + 執行層 — Notification + Action Executor
*目標*：完整的請求 → 執行 → 回饋 流程

*任務*：
1. 建立 Notification Service 模組
2. 將 executor-agents 重構為 Action Executor 模組
3. 集成測試整個流程

*預期成果*：所有 6 個模組就位，單體應用成功拆分

### Phase 4（第 5-6 週）：990 Lite 接入 + Auto-Executor 準備
*目標*：驗證模組化架構的可擴展性

*任務*：
1. 990 Lite 直接調用 Core Logic Engine（無需 Telegram 中介）
2. 為 Auto-Executor 設計觸發機制（定時任務、事件驅動）
3. 部署測試

---

## 模組間通訊協議（赫耳墨斯協議）

### 標準命令格式

{
  "source": "telegram" | "http" | "auto-executor",
  "userId": "123",
  "commandId": "cmd-uuid",
  "command": "scan" | "query" | "execute",
  "payload": { ... },
  "timestamp": "2026-03-03T14:00:00Z"
}
`

### 標準回應格式

{
  "status": "success" | "error" | "pending",
  "commandId": "cmd-uuid",
  "result": { ... },
  "error": null,
  "timestamp": "2026-03-03T14:00:05Z"
}
``

---

## 遷移成本評估

| 階段 | 工作量 | 風險 | ROI |
|------|--------|------|-----|
| Phase 1 | 40 小時 | 低 | 高（基礎穩固） |
| Phase 2 | 30 小時 | 低 | 中（標準化通訊） |
| Phase 3 | 25 小時 | 中 | 中（完整流程） |
| Phase 4 | 20 小時 | 中 | 高（未來擴展） |
| *總計* | */Users/sky770825115 小時* | *可控* | *顯著* |

---

## 決策點

✅ *推薦實施*：
- 模組化是 990 Lite 和 Auto-Executor 的必要基礎
- 分階段實施，每個 Phase 都能獨立交付價值
- 風險可控，遷移期間可與舊架構並行運行

❓ *需要確認*：
- 990 Lite 的具體功能需求（影響 Phase 4 的設計）
- 是否需要向下相容舊的 API 端點
- Auto-Executor 的優先級（影響 Phase 4 的優先度）