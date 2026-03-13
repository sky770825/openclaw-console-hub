# OpenClaw 程式碼索引

> NEUXA 用：不要猜，查這份索引。收到任何指令，先比對關鍵字找到對應檔案。

專案位置：/Users/sky770825/openclaw任務面版設計/
技術棧：React + TypeScript + Vite + Express.js + Supabase
Server: localhost:3011 | GitHub: sky770825/openclaw-console-hub

---

## 快速索引（關鍵字 → 檔案）

想做什麼 → 去看哪個檔案

| 關鍵字 | 檔案 | 說明 |
|--------|------|------|
| 任務執行、Agent、AI 生腳本 | server/src/executor-agents.ts | 心臟。Agent 選擇 + Gemini 生成腳本 + sandbox 執行 + 品質評分 |
| AutoExecutor、自動執行、排程 | server/src/routes/auto-executor.ts | 每 10 秒掃描 ready 任務 → 呼叫 executor-agents 執行 |
| 任務 CRUD、建任務、改狀態 | server/src/routes/openclaw-tasks.ts | 純 Supabase 讀寫，不含執行邏輯 |
| Supabase、資料庫、查資料 | server/src/openclawSupabase.ts | 所有表的 CRUD 函數 |
| 型別、Task、Run、AgentType | server/src/types.ts | TypeScript 型別定義 |
| Telegram、bot、聊天 | server/src/telegram-stop-poll.ts | getUpdates 輪詢 + NEUXA AI 對話 + action 執行 |
| 通知、發 Telegram 訊息 | server/src/utils/telegram.ts | sendTelegramMessage, notifyTaskSuccess/Failure |
| 風險分類、dispatch 審核 | server/src/riskClassifier.ts | classifyTaskRisk() → none/low/medium/critical |
| 斷路器、治理、預算 | server/src/governanceEngine.ts | circuit breaker + 自動回滾 + 驗收 |
| 防卡關、超時、重試 | server/src/anti-stuck.ts | 超時監控 + 自動重試 + 模型降級 |
| FADP、聯盟、協防 | server/src/routes/federation.ts | 成員管理 + 握手 + 攻擊事件 + 封鎖 |
| 認證、API key 驗證 | server/src/middlewares/auth.ts | Bearer token 驗證 |
| n8n、工作流 | server/src/n8nClient.ts | n8n API 封裝 |
| 緊急停止 | server/src/emergency-stop.ts | /stop 指令處理 |
| Prompt 注入防護 | server/src/promptGuard.ts | 掃描惡意 prompt |
| Server 啟動、路由掛載 | server/src/index.ts | Express app 入口，所有 route 掛載 |

---

## 後端函數索引

### executor-agents.ts（任務執行心臟）

| 函數/方法 | 做什麼 |
|-----------|--------|
| AgentSelector.selectAgent(task) | 根據 riskLevel/complexity/tags 自動選 agent |
| AgentExecutor.execute(task, agentType) | 執行入口 → 返回 AgentExecutionResult |
| .generateAndExecute(taskName, desc, timeout) | 主流程：AI 生腳本 → sandbox 執行 → 重試 |
| .callGeminiForScript(taskName, desc, errorFeedback?) | 呼叫 Gemini 2.5 Flash 生成 bash 腳本 |
| .executeSandboxScript(script, timeoutMs) | 在 SANDBOX_ENV 跑腳本（無 key 洩漏） |
| .scanArtifacts() | 掃描 sandbox/output/ 下的產出物 |
| .gradeExecution(task, result) | 品質評分（3 層閘門，100 分制） |
| .executeWithClaudeCLI(...) | 用 claude CLI 執行（訂閱版） |
| .verifyAgentInstallation(agentType) | 檢查 CLI 是否安裝 |

品質閘門：Gate1 完整性(40分) + Gate2 產出物(30分) + Gate3 內容(30分)

### openclawSupabase.ts（資料庫操作）

| 函數 | 做什麼 |
|------|--------|
| fetchOpenClawTasks() | 取所有任務 |
| fetchOpenClawTaskById(id) | 取單一任務 |
| upsertOpenClawTask(task) | 新增/更新任務（智慧合併，不覆蓋現有） |
| insertOpenClawRun(payload) | 插入執行紀錄 |
| updateOpenClawRun(runId, patch) | 更新執行紀錄 |
| fetchOpenClawRuns(limit?, taskId?) | 取執行紀錄 |
| fetchOpenClawReviews() | 取審核 |
| upsertOpenClawReview(review) | 新增/更新審核 |
| fetchOpenClawMemory(opts?) | 取知識庫 |
| searchOpenClawMemory(query, opts?) | 搜尋知識庫 |
| upsertOpenClawMemory(mem) | 寫入知識庫 |
| fetchOpenClawProjects() | 取專案 |
| fetchXiaoCaiIdeas() | 取達爾想法 |

### routes/auto-executor.ts（自動執行調度）

| 端點/函數 | 做什麼 |
|-----------|--------|
| GET /auto-executor/status | 執行器狀態（isRunning、today 執行數） |
| POST /auto-executor/start | 啟動（設定 interval、maxTasksPerMinute） |
| POST /auto-executor/stop | 停止 |
| GET /dispatch/status | 派工模式狀態 + 待審任務 |
| POST /dispatch/toggle | 開關派工模式 |
| POST /dispatch/review/:taskId | 主人審核（approved/rejected） |
| startAutoExecutor(interval?, maxTpm?) | 啟動執行迴圈 |
| stopAutoExecutor() | 停止 |

### telegram-stop-poll.ts（Telegram 控制）

| 函數 | 做什麼 |
|------|--------|
| startTelegramStopPoll() | 啟動所有 Telegram 輪詢 |
| stopTelegramStopPoll() | 停止 |
| xiaocaiThink(chatId, message) | NEUXA AI 思考（呼叫 Gemini 2.5 Pro） |
| loadSoulCore() | 載入靈魂核心（SOUL.md + AGENTS.md + ...） |
| loadAwakeningContext(message) | 按需載入覺醒知識 |
| executeNEUXAAction(action) | 執行 NEUXA action（read/write/mkdir/move/list/run） |
| isPathSafe(path, operation) | 路徑安全檢查 |
| isScriptSafe(script) | 腳本安全檢查 |
| createTask(name, description?) | 建立任務（呼叫 API） |

---

## API 端點索引

| 方法 | 路徑 | 做什麼 |
|------|------|--------|
| GET | /api/health | 系統健康 + autoExecutor 狀態 |
| GET | /api/openclaw/tasks | 任務列表 |
| POST | /api/openclaw/tasks | 建立任務 |
| PUT | /api/openclaw/tasks/:id | 更新任務 |
| GET | /api/openclaw/auto-executor/status | AutoExecutor 狀態 |
| POST | /api/openclaw/auto-executor/start | 啟動 AutoExecutor |
| POST | /api/openclaw/auto-executor/stop | 停止 AutoExecutor |
| POST | /api/openclaw/run-next | 手動執行下一個任務 |
| GET | /api/openclaw/dispatch/status | 派工狀態 |
| POST | /api/openclaw/dispatch/toggle | 開關派工 |
| POST | /api/openclaw/dispatch/review/:id | 審核派工任務 |
| GET | /api/openclaw/governance/status | 治理引擎狀態 |
| POST | /api/openclaw/governance/circuit-breaker/reset | 重置斷路器 |
| GET | /api/federation/status | FADP 聯盟狀態 |
| GET | /api/federation/members | 聯盟成員 |
| POST | /api/federation/handshake/init | 發起握手 |
| GET | /api/n8n/workflows | n8n 工作流列表 |
| POST | /api/n8n/trigger-webhook | 觸發 n8n webhook |
| GET | /api/openclaw/reviews | 審核列表 |
| GET | /api/openclaw/memory | 知識庫 |
| POST | /api/openclaw/deputy/on | 開啟副手模式 |

---

## Supabase 資料表索引

| 表名 | 關鍵欄位 | 用途 |
|------|----------|------|
| openclaw_tasks | id, title, cat, status(queued/in_progress/done), progress, auto, thought, subs | 任務板 |
| openclaw_runs | id, task_id, status(running/success/failed), started_at, output_summary | 執行記錄 |
| openclaw_reviews | id, title, type, status, priority | 審核/想法 |
| openclaw_automations | id, name, cron, active, chain[] | 自動化規則 |
| openclaw_memory | id, content, keywords[] | AI 記憶庫 |
| openclaw_evolution_log | 演化記錄 |
| openclaw_projects | id, name, phases[] | 專案 |
| openclaw_audit_logs | 稽核日誌 |
| xiaocai_ideas | 達爾發想 |
| fadp_members | FADP 成員 |
| fadp_attack_events | 攻擊事件 |
| fadp_blocklist | 封鎖名單 |

---

## 前端頁面索引

| 路由 | 頁面 | 做什麼 |
|------|------|--------|
| / | Dashboard | 首頁儀表板、即時統計 |
| /tasks | TaskBoard | 任務板主介面 |
| /runs | Runs | 執行紀錄 |
| /logs | Logs | 日誌分析 |
| /alerts | Alerts | 告警管理 |
| /projects | Projects | 專案管理 |
| /review | ReviewCenter | 審核中心 |
| /control | ControlCenter | 系統控制 |
| /settings | Settings | 設定 |
| /center/ai | AIDeck | AI 甲板 |
| /center/commerce | LogisticsDeck | 後勤甲板 |
| /center/infra | InfraDeck | 工程甲板 |
| /center/automation | AutomationDeck | 自動化甲板 |
| /center/communication | CommunicationDeck | 通信甲板 |
| /center/engine | EngineDeck | 輪機艙 |
| /center/defense | DefenseCenter | 防禦甲板 + FADP |
| /center/protection | ProtectionCenter | 保護甲板 |

---

## 前端 Hooks 索引

| Hook | 做什麼 |
|------|--------|
| useWebSocket | WebSocket 即時推播 + 自動重連 |
| useTaskExecution | 任務執行狀態管理 |
| useMDCI | MDCI 數據快取 |
| useControlCenter | 控制中心狀態 |
| useFeatures | 功能開關 |
| useDebounce | 防抖 |
| useKeyboardShortcuts | 全局鍵盤快捷鍵 |
| usePerformanceMonitoring | 效能指標 |
| useFederationPostMessageGuard | FADP postMessage 防護 |

---

## 任務執行完整流程

1. 建立任務 → openclaw_tasks 寫入（status: pending/ready）
2. AutoExecutor 每 10 秒掃描 status=ready
3. 撿到 → 標記 in_progress → riskClassifier 評估風險
4. critical → 放入待審佇列 → Telegram 通知主人 → 等批准
5. 其他 → AgentSelector.selectAgent() 選 agent
6. AgentExecutor.execute() → generateAndExecute()
7. callGeminiForScript() → Gemini 2.5 Flash 生成 bash 腳本
8. executeSandboxScript() → 沙盒執行（SANDBOX_ENV 無 key）
9. gradeExecution() → 品質評分（60 分以上才算通過）
10. 成功 → done + 寫 run + Telegram 通知
11. 失敗 → 重試最多 2 次 → 還失敗 → failed + 通知

---

## 部署與管理

| 操作 | 指令 |
|------|------|
| 重啟 server | launchctl stop com.openclaw.taskboard && sleep 2 && launchctl start com.openclaw.taskboard |
| 健康檢查 | curl http://localhost:3011/api/health |
| 看 log | tail -f ~/.openclaw/automation/logs/taskboard.log |
| 找 PID | lsof -i :3011 -sTCP:LISTEN |
| Build server | cd server && npx tsc |
| Build 前端 | npx vite build |
