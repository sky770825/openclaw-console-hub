# OpenClaw Supabase 設定與寫入

## 一、資料表

已建立以下 Supabase 表（透過 migration `create_openclaw_tables`）：

| 表名 | 用途 |
|------|------|
| `openclaw_tasks` | 任務看板（標題、進度、子任務、thought） |
| `openclaw_reviews` | 審核中心（待批准／已批准／已駁回） |
| `openclaw_automations` | 自動化流程（cron、chain、health） |
| `openclaw_evolution_log` | 進化紀錄 |
| `openclaw_plugins` | Plugin 市集 |
| `openclaw_audit_logs` | 稽核日誌 |
| `openclaw_ui_actions` | 按鈕/元件代碼對應（action_code、selector、api_path、n8n_webhook_url） |

## 二、環境變數

在專案根目錄 `.env` 設定：

```env
# Supabase（專案 vbejswywswaeyfasnwjq）
SUPABASE_URL=https://vbejswywswaeyfasnwjq.supabase.co
SUPABASE_ANON_KEY=eyJ...（公開 key，前端用）
SUPABASE_SERVICE_ROLE_KEY=eyJ...（僅後端，可 bypass RLS）
```

- **anon key**：前端直接呼叫 Supabase 時用
- **service_role key**：後端 server 用，具完整權限，請勿暴露給前端

### 新專案初次設定

若使用新的 Supabase 專案，需先執行 `docs/supabase-openclaw-migration.sql`：
1. 登入 Supabase Dashboard → 選擇專案
2. 左側 SQL Editor → 貼上該檔內容 → Run

## 三、後端 API（寫入 Supabase）

Server 啟動後提供以下 API，會寫入 Supabase：

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/openclaw/tasks` | 取得任務列表 |
| POST | `/api/openclaw/tasks` | 建立／更新任務 |
| PATCH | `/api/openclaw/tasks/:id` | 更新任務（含進度） |
| GET | `/api/openclaw/reviews` | 取得審核列表 |
| POST | `/api/openclaw/reviews` | 建立／更新審核 |
| PATCH | `/api/openclaw/reviews/:id` | 更新審核（批准／駁回） |
| GET | `/api/openclaw/automations` | 取得自動化列表 |
| POST/PATCH | `/api/openclaw/automations` | 建立／更新自動化 |
| GET/POST | `/api/openclaw/evolution-log` | 進化紀錄 |

## 四、連線流程

1. **後端**：`cd server && npm run dev`（需有 .env 的 SUPABASE_*）
2. **前端**：`VITE_API_BASE_URL=http://localhost:3011` 指向後端
3. **OpenClaw v4 板**（`/cursor`）：需改為呼叫上述 API 以載入／儲存 Supabase 資料

## 五、前端接 Supabase（選用）

若不想經由後端，前端可直接用 `@supabase/supabase-js` + anon key 呼叫 Supabase。需在 `.env` 加：

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

然後在 openclaw-cursor 頁面使用 `createClient(url, anonKey)` 讀寫 `openclaw_*` 表。
