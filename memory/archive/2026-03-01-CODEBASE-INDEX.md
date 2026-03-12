# 程式碼快查索引

> 收到指令先查這裡，用關鍵字找到檔案，再用 read_file 看內容。不要 list_dir 一層層找。
> 更新：2026-03-02

專案位置：/Users/caijunchang/openclaw任務面版設計/
技術棧：React + TypeScript + Vite + Express + Supabase

想做什麼 → 去看哪個檔案：
- 任務執行/Agent/AI生腳本 → server/src/executor-agents.ts
- AutoExecutor/自動執行/排程 → server/src/routes/auto-executor.ts
- 任務CRUD/建任務/改狀態 → server/src/routes/openclaw-tasks.ts
- Supabase/資料庫/查資料 → server/src/openclawSupabase.ts
- 型別/Task/Run/AgentType → server/src/types.ts
- Telegram/bot/聊天/輪詢 → server/src/telegram/bot-polling.ts
- Telegram/action執行/沙盒 → server/src/telegram/action-handlers.ts（21 個 action，見下方清單）
- Telegram/安全/路徑封鎖 → server/src/telegram/security.ts
- Telegram/AI思考/system prompt → server/src/telegram/xiaocai-think.ts（含工具說明、claude 節約策略）
- Telegram/模型路由/provider → server/src/telegram/model-registry.ts
- 通知/發TG訊息 → server/src/utils/telegram.ts
- 金鑰保險箱/脫敏 → server/src/utils/key-vault.ts
- 風險分類/dispatch審核 → server/src/riskClassifier.ts
- 斷路器/治理/預算 → server/src/governanceEngine.ts
- 防卡關/超時/重試 → server/src/anti-stuck.ts
- FADP/聯盟/協防 → server/src/routes/federation.ts
- API代理/proxy → server/src/routes/proxy.ts
- 認證/API key驗證 → server/src/middlewares/auth.ts
- n8n/工作流 → server/src/n8nClient.ts
- 緊急停止 → server/src/emergency-stop.ts
- Prompt注入防護 → server/src/promptGuard.ts
- Server啟動/路由掛載 → server/src/index.ts
- 日誌/log/pino → server/src/logger.ts

API 端點：
- GET /api/health → 系統健康
- GET/POST /api/openclaw/tasks → 任務列表/建任務
- PATCH /api/openclaw/tasks/:id → 更新任務
- DELETE /api/openclaw/tasks/:id → 刪除任務
- GET/POST /api/openclaw/auto-executor/status|start|stop → AutoExecutor
- POST /api/openclaw/run-next → 手動執行下一個
- GET/POST /api/openclaw/dispatch/status|toggle|review/:id → 派工
- GET /api/openclaw/governance/status → 治理引擎
- GET /api/federation/status|members → FADP聯盟
- POST /api/proxy/fetch → 安全API代理（Key不出門）
- POST /api/proxy/supabase → Supabase查詢代理
- GET /api/proxy/supabase/tables → 可查詢的表清單

Supabase 表：
- openclaw_tasks → 任務板（id,title,cat,status,progress,auto,thought,subs,created_at,updated_at）
- openclaw_runs → 執行記錄（id,task_id,status,output_summary）
- openclaw_reviews → 審核/想法
- openclaw_memory → AI記憶庫
- openclaw_projects → 專案
- openclaw_automations → 自動化規則
- openclaw_evolution_log → 演化記錄
- openclaw_audit_logs → 稽核日誌
- fadp_members → FADP聯盟成員
- fadp_attack_events → 攻擊事件
- fadp_blocklist → 封鎖名單
（注意：schedules/shifts/attendance/employees 在loc_yangmeibiz_food_truck的 Supabase，不在這裡）

前端路由：
/ → Dashboard | /tasks → TaskBoard | /runs → Runs
/center/ai → AI甲板 | /center/commerce → 後勤 | /center/infra → 工程
/center/automation → 自動化 | /center/communication → 通信
/center/engine → 輪機 | /center/defense → 防禦 | /center/protection → 保護

任務執行流程：建任務(ready) → AutoExecutor撿到(Fast Lane排序) → riskClassifier評風險 → AgentSelector選agent → Gemini生bash → sandbox執行 → 品質評分(60分過) → done/failed

---

NEUXA Action 清單（action-handlers.ts，共 21 個）：
- 任務操作：create_task, update_task
- 檔案操作：read_file, write_file, mkdir, move_file, list_dir, patch_file（差異修補）
- 執行操作：run_script（白名單模式）, code_eval, pty_exec（互動式命令，支援 answers + timeout）
- 搜尋操作：semantic_search（向量庫語義搜尋）, grep_project（正則搜尋專案）, find_symbol（符號定位）
- 知識操作：index_file, reindex_knowledge
- 網路操作：web_search, web_fetch, proxy_fetch
- AI 諮詢：ask_ai（flash 優先，claude 只在老蔡指定或真正需要時用）, analyze_code
- 資料庫：query_supabase
- 規劃操作：plan_project（拆解專案為子任務進 draft）, roadmap（路線圖 create/status/update）
- 已封鎖：run_script_bg（禁用）

---

bot-polling.ts 行動鏈機制：
- MAX_CHAIN_STEPS = 15（從舊版 5 步升級）
- ActionCircuitBreaker：同一 action 連續失敗 2 次即阻擋第 3 次
- 重複 action 偵測：連續 3 步完全相同的 action 組合 → 自動中斷防無限迴圈
- 並行執行：同一步內多個 action 用 Promise.all 並行

---

auto-executor.ts 並發架構：
- 2 並發槽位（MAX_CONCURRENT=2, activeSlots[]），單槽超時 2 分鐘自動回收
- Fast Lane 排序：快速任務（查詢/讀取/分析）優先，慢任務（build/deploy/install）靠後
- 跳過已在槽位中的任務，避免同一任務跑兩次

---

xiaocai-think.ts systemPrompt 要點：
- ask_ai model=flash 優先（2-5 秒），claude 很慢（30-60 秒）只在老蔡明確要求或真正搞不定時用
- 工具說明內嵌 prompt：每個 action 的用途、參數、使用時機
- 終極目標：「老蔡能根據你的結論做決定」，不是單純「我執行了」
