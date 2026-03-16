# OpenCode Agent 儀表板功能說明

本文件說明內部儀表板「OpenCode Agent 版」各頁面職責、按鈕與 API 串接，以及專案執行與審核的細節。

## 總覽

儀表板負責：**專案製作**、**任務看板**、**任務列表**、**執行紀錄**、**日誌**、**警報**、**發想審核**、**領域分類**與**設定**。  
每個頁面均與後端 API 或 Supabase 對接，按鈕具實質功能；危險操作由 API Key / Feature Flags 控管。

---

## 1. 儀表板 `/`

- **功能**：總覽、AutoExecutor / Autopilot 啟停、健康狀態、近期執行、警報摘要。
- **按鈕與串接**：
  - **啟動 / 停止 AutoExecutor** → `POST /api/openclaw/auto-executor/start`、`stop`
  - **啟動 / 停止 Autopilot** → `POST /api/openclaw/autopilot/start`、`stop`
  - **緊急停止**（Feature Flag：`ops.emergencyStop`）→ `POST /api/emergency/stop-all`（需 Admin Key）
  - **Telegram 測試** → `POST /api/telegram/force-test`
- **資料**：`/api/stats`、`/api/runs`、`/api/alerts`、`/api/audit-logs`、`/api/tasks/compliance`。

---

## 2. OpenClaw Agent 板 `/cursor`

- **功能**：整合 OpenClaw 看板（任務／發想／自動化）。
- **按鈕與串接**：依 `openclaw-cursor.jsx` 行為，與 `/api/openclaw/*`（tasks、reviews、automations、board-config、board-health）對接；執行任務 → `/api/openclaw/tasks/:id/run`。
- **開關**：Feature Flag `page.cursor`。

---

## 3. 專案製作 `/projects`

- **功能**：專案內容編排、階段（phases）、**指派執行對象**、與任務列表／執行紀錄串接。
- **內容編排與指派**：
  - 專案可設定 **指派執行對象**（OpenClaw / Cursor / Codex）與顯示名稱；階段可選填執行對象（覆寫專案預設）。
  - 資料存於 Supabase：`openclaw_projects`、`openclaw_project_phases`（含 `assignee_agent`、`assignee_label`）。
- **按鈕與串接**：
  - **新增 / 編輯 / 刪除專案** → `GET/POST/PATCH/DELETE /api/openclaw/projects`（後端寫入 Supabase；失敗時前端 fallback localStorage）。
  - **任務列表** → 導向 `/tasks/list` 並帶入專案 id/title（state），任務列表頁可顯示「來自專案 XXX」。
- **資料庫**：`openclaw_projects`、`openclaw_project_phases`（經 migration 建立）。
- **專案欄位（與 Supabase 同步）**：除基本欄位外，含 `deadline`、`priority`（1–5）、`tags`、`deliverables_summary`、`linked_task_ids`；卡片與編輯表單皆可填寫與顯示。
- **寫入驗證**：儲存成功後，頁面會顯示「✓ 已寫入 Supabase（後端）」或「✓ 已儲存至本地（後端未連線）」，可據此確認資料是否已寫入 Supabase。

---

## 4. 任務看板 `/tasks`

- **功能**：看板式任務管理、domain 主分類、抽屜總覽（索引級內容、SSoT 路徑、SOP 路徑）。
- **按鈕與串接**：
  - 任務 CRUD、狀態變更 → `/api/tasks`、`/api/tasks/:id`（PATCH）、`/api/openclaw/tasks`（看板用）。
  - **立即執行** → `POST /api/openclaw/tasks/:id/run` 或 `POST /api/tasks/:id/run`。
- **資料**：任務來自 Supabase `openclaw_tasks`（或 in-memory fallback）；domain 來自 `/api/domains`。

---

## 5. 任務列表 `/tasks/list`

- **功能**：列表檢視、搜尋／篩選／排序、**任務列表與執行過程紀錄**的入口。
- **按鈕與串接**：
  - **立即執行** → `POST /api/tasks/:id/run`（或透過 api.runNow）。
  - **編輯** → 導向 `/tasks/:taskId`。
  - **移至 Blocked / 解除封鎖** → `PATCH /api/tasks/:id`（status）。
  - **查看執行紀錄** → 導向 `/runs?task=<taskId>`，執行紀錄頁依 `task` 參數篩選該任務的 runs。
- **來自專案**：從專案頁點「任務列表」會帶 state（projectId、projectTitle），列表頁 description 顯示「專案「XXX」的任務與執行紀錄」。

---

## 6. 執行紀錄 `/runs`

- **功能**：所有任務的執行歷史；支援依 **任務** 篩選，對應「任務列表與執行過程紀錄」。
- **按鈕與串接**：
  - **重新執行** → `POST /api/runs/:id/rerun`。
  - **自訂輸入執行** → 依實作觸發 run（可接後端自訂參數）。
- **篩選**：URL 參數 `?task=<taskId>` 時僅顯示該任務的 runs；標題顯示「任務「XXX」的執行過程紀錄」。
- **資料**：`/api/runs`（Supabase `openclaw_runs` 或 evolution_log 對應）。

---

## 7. 日誌 `/logs`

- **功能**：故障排查、匯出／篩選為前端行為。
- **資料**：`/api/logs`（有後端時從後端取得）。

---

## 8. 警報 `/alerts`

- **功能**：對應 reviews/alerts、ack/snooze。
- **按鈕與串接**：狀態更新 → `PATCH /api/alerts/:id`（後端對應 `openclaw_reviews` 的 status）。
- **建立事件**：Feature Flag `ops.incidentCreate` 控制（預設關閉，避免模擬濫用）。

---

## 9. 發想審核 `/review`

- **功能**：發想列表、通過／拒絕、審核備註、批量通過。
- **按鈕與串接**：
  - **列表** → `GET /api/openclaw/reviews`（回傳已映射為前端 Review 格式：id, number, title, summary, filePath, status, createdAt, reviewedAt, reviewNote, tags）。
  - **審核** → `PATCH /api/openclaw/reviews/:id`（body：status, reviewNote, reviewedAt）；後端寫入 `openclaw_reviews`（status、reasoning 等）。
- **對應**：後端 `openClawReviewToReview` 將 DB 的 title/desc/src/pri/type/status/reasoning 映射為前端 Review 欄位。

---

## 10. 領域分類 `/domains`

- **功能**：任務主分類（taxonomy）可視化、SOP 路徑、複製標籤。
- **按鈕與串接**：**複製 SOP 路徑**、**複製標籤** `domain:<slug>` 為前端複製；資料來自 `GET /api/domains`（與後端 `domains.ts` 一致）。

---

## 11. 設定 `/settings`

- **功能**：一般設定、整合、通知、**功能開關（Feature Flags）**、角色與權限展示。
- **按鈕與串接**：
  - **功能開關** → `GET /api/features`、`PATCH /api/features`（需 Admin API Key）；開關項目含頁面顯示（page.*）、任務批次（task.bulkOps）、緊急停止與建立事件（ops.*）。
  - 未設定 `VITE_API_BASE_URL` 時，功能開關僅提示需設定後端。
- **開關**：Feature Flag `page.settings`。

---

## 專案執行與審核細節（對應需求）

- **(a) 內容編排與指派執行對象**  
  - 在 **專案製作** 頁：專案可設定「指派執行對象」（OpenClaw / Cursor / Codex）與顯示名稱；階段可選填執行對象。  
  - 儲存於 `openclaw_projects.assignee_agent`、`assignee_label` 與 `openclaw_project_phases.assignee_agent`。

- **(b) 任務列表與執行過程紀錄**  
  - **任務列表** 頁提供「查看執行紀錄」→ 導向 `/runs?task=<taskId>`。  
  - **執行紀錄** 頁依 `?task=` 篩選該任務的 runs，並顯示「任務「XXX」的執行過程紀錄」。  
  - 專案頁「任務列表」按鈕帶專案資訊至任務列表，方便從專案維度查看任務與執行紀錄。

---

## 資料庫與後端

- **Supabase**：`openclaw_tasks`、`openclaw_reviews`、`openclaw_automations`、`openclaw_runs`、`openclaw_evolution_log`、`openclaw_audit_logs`、`openclaw_ui_actions`、**openclaw_projects**、**openclaw_project_phases**（專案製作）。
- **後端**：Express，`/api/*` 與 `/api/openclaw/*`；寫入依 `OPENCLAW_ENFORCE_WRITE_AUTH` 與 API Key 驗證；Admin 操作用 `OPENCLAW_ADMIN_KEY`。

---

## 安全與治理

- 寫入（POST/PATCH/PUT/DELETE）預設需 `x-api-key` 或 `Authorization: Bearer <key>`。
- 功能開關、緊急停止、重啟 gateway、n8n webhook 等由 Admin Key 控管。
- Feature Flags 儲存於 `server/.features.json`，可攜帶備份／移轉。
