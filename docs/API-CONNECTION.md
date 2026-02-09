# OpenClaw API 連線說明

## 快速啟動（本機開發）

1. **啟動後端**（提供 API）：
   ```bash
   cd server
   npm run dev
   ```
   後端預設在 `http://localhost:3001`

2. **啟動前端**：
   ```bash
   npm run dev
   ```
   前端在 `http://localhost:3009`（或 vite.config 設定的 port）

3. **API 連線方式**：
   - Vite 開發伺服器會將 `/api/*` 自動 **proxy 轉發** 至 `http://localhost:3001`
   - 因此 OpenClaw Agent 板、儀表板、任務看板等都會打到後端
   - 無須額外設定 `VITE_API_BASE_URL`（本機開發時）

## 環境變數

| 變數 | 說明 |
|------|------|
| `VITE_API_BASE_URL` | 後端 API 根網址。不設時，開發環境會用同源（經 proxy）；正式部署請設為實際 API 網址 |
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 後端用，寫入 openclaw_* 表 |

## 資料同步架構

| 主應用頁面 | 資料來源（有 Supabase 時） | 對應表 |
|------------|---------------------------|--------|
| 儀表板 | /api/stats | openclaw_tasks + evolution_log |
| 任務看板 / 任務列表 | /api/tasks | openclaw_tasks |
| 執行紀錄 | /api/runs | openclaw_evolution_log |
| 日誌 | /api/logs | openclaw_evolution_log |
| 警報 | /api/alerts | openclaw_reviews |
| 稽核紀錄 | /api/audit-logs | openclaw_audit_logs |

**OpenClaw Agent 板**（/cursor）直接讀寫 `/api/openclaw/tasks`、`/api/openclaw/reviews`、`/api/openclaw/automations`、`/api/openclaw/evolution-log`，後端會寫入 Supabase。

## 若出現「API 路徑不對」

1. 確認 **後端已啟動**：`cd server && npm run dev`
2. 確認 **埠號**：後端預設 3001，若修改需同步調整 `vite.config.ts` 的 proxy target
3. 正式環境：設定 `VITE_API_BASE_URL` 為實際 API 網址
