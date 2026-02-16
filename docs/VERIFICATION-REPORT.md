# OpenClaw v4 功能驗證報告

## 1. 按鈕與功能實施狀態

| 功能 | 狀態 | 說明 |
|------|------|------|
| Tab 導航 | ✅ | 總覽 / 自動化 / 審核 / 任務 / n8n / API / 安全 / Plugin / 進化 |
| 審核：批准 | ✅ | 點擊 ✓ 批准，寫入 Supabase |
| 審核：駁回 | ✅ | 點擊 ✕，寫入 Supabase |
| 審核：檢視推理 | ✅ | 點擊推理區塊開啟 Drawer |
| 審核：編輯 | ✅ | Drawer 內點編輯，可改標題/描述/推理，儲存寫入 DB |
| 任務：推進 | ✅ | 點擊 ▶ 推進，完成子任務，寫入 Supabase |
| 任務：檢視思維 | ✅ | 點擊思維區塊開啟 Drawer |
| 任務：編輯 | ✅ | Drawer 內編輯標題/思維/子任務，儲存寫入 DB |
| 自動化：切換啟用 | ✅ | 切換開關，寫入 Supabase |
| 自動化：檢視/編輯 | ✅ | 點擊卡片開啟 Drawer，可編輯 cron、流程鏈 |
| Drawer：編輯/儲存/取消/關閉 | ✅ | 全部可操作 |
| 進化紀錄 | ✅ | 批准/駁回/推進時自動新增，寫入 Supabase |

---

## 2. 資料庫儲存與系統架構

### 2a. Supabase 表單

| 表名 | 用途 | 狀態 |
|------|------|------|
| openclaw_tasks | 任務看板 | ✅ |
| openclaw_reviews | 審核中心 | ✅ |
| openclaw_automations | 自動化流程 | ✅ |
| openclaw_evolution_log | 進化紀錄 | ✅ |
| openclaw_plugins | Plugin 市集 | ✅ |
| openclaw_audit_logs | 稽核日誌 | ✅ |
| openclaw_ui_actions | 按鈕/元件代碼對應 | ✅ |

### 2b. API 端點（寫入 Supabase）

| 方法 | 路徑 | 寫入表 |
|------|------|--------|
| GET/POST/PATCH | /api/openclaw/tasks | openclaw_tasks |
| GET/POST/PATCH | /api/openclaw/reviews | openclaw_reviews |
| GET/POST/PATCH | /api/openclaw/automations | openclaw_automations |
| GET/POST | /api/openclaw/evolution-log | openclaw_evolution_log |
| GET | /api/openclaw/ui-actions | openclaw_ui_actions（唯讀） |

### 2c. 按鈕連結儲存

- `openclaw_ui_actions` 表儲存：action_code、selector、label、category、api_path、n8n_webhook_url
- Tab 導航已預填
- 可擴充：將 N8n 工作流 URL、API 路徑寫入 api_path、n8n_webhook_url 欄位

---

## 3. OpenClaw 執行準則與代碼化

### 3a. 執行準則
- 已建立 `docs/OPENCLAW-GUIDELINES.md`
- 準則：使用 `data-oc-action` selector 操作，不依賴快照

### 3b. 座標代碼化
- 所有按鈕、可點擊 Card、Drawer 按鈕已加上 `data-oc-action`
- 使用 selector 代碼化，非像素座標（避免響應式版面問題）

### 3c. 對照表
- 已建立 `docs/OPENCLAW-ACTION-MAP.md`
- 含 Tab、Review、Task、Auto、Drawer 的完整代碼對照

---

## 4. 待擴充項目（可選）

- 將 N8n 工作流 Webhook URL 寫入 `openclaw_ui_actions.n8n_webhook_url`
- 將 API 路徑寫入 `openclaw_ui_actions.api_path`
- Plugin、Security、API 等 panel 的連結若需可點擊，可再加 data-oc-action
