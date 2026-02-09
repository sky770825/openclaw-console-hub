# OpenClaw API 串接與自動化

## 一、API 串接（任務讀取）

OpenClaw 板（`/cursor`）從後端載入任務，優先使用 Supabase，若為空則 fallback 到 in-memory 主應用任務。

| 端點 | 說明 |
|------|------|
| `GET /api/openclaw/tasks` | 取得任務列表（OpenClaw 格式） |
| `GET /api/tasks` | 取得任務列表（主應用格式） |
| `POST /api/openclaw/tasks` | 建立任務（寫入 Supabase） |
| `PATCH /api/openclaw/tasks/:id` | 更新任務 |

**前置**：`.env` 設定 `VITE_API_BASE_URL=http://localhost:3001`，前端會呼叫後端 API。

---

## 二、測試執行

### 2.1 建立測試任務

```bash
# 主應用格式（in-memory）
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"OpenClaw 測試任務","description":"給 OpenClaw 執行","status":"ready"}'

# OpenClaw 格式（需 Supabase migration）
curl -X POST http://localhost:3001/api/openclaw/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"oc-test-1","title":"OpenClaw 測試","cat":"feature","status":"queued","progress":0,"auto":false,"subs":[]}'
```

### 2.2 執行任務

```bash
# 執行指定任務
curl -X POST http://localhost:3001/api/openclaw/tasks/{taskId}/run
# 或
curl -X POST http://localhost:3001/api/tasks/{taskId}/run
```

回傳新建立的 Run，含 `id`、`status`、`startedAt` 等。

### 2.3 驗證

1. 開啟 http://localhost:3012/cursor 應能看到任務
2. 透過主應用 http://localhost:3012/tasks 執行任務
3. 查詢 Run：`curl http://localhost:3001/api/runs`

---

## 三、自動化

### 3.1 自動執行下一個 queued 任務

```bash
curl -X POST http://localhost:3001/api/openclaw/run-next
```

會挑選第一個 `status=queued` 的任務並執行，回傳 `{ run, taskId }`。若無可執行任務則回傳 `{ ok: false, message: "No queued task to run" }`。

### 3.2 自動啟動（後端）

使用 `systemd` 或 `pm2` 讓後端常駐：

```bash
# pm2 範例
cd server && pm2 start "npm run dev" --name openclaw-api
pm2 save
pm2 startup
```

### 3.3 排程觸發（cron / n8n）

- **cron**：每分鐘呼叫 `POST /api/openclaw/run-next`
  ```bash
  * * * * * curl -s -X POST http://localhost:3001/api/openclaw/run-next
  ```
- **n8n**：建立 Cron 節點 → HTTP Request 呼叫 `POST /api/openclaw/run-next`

### 3.4 按鈕對應 API（供 cron / n8n / OpenClaw 自動化）

| 按鈕 | API | 範例 |
|------|-----|------|
| 批准審核 | `PATCH /api/openclaw/reviews/:id` | `curl -X PATCH http://localhost:3001/api/openclaw/reviews/r1 -H "Content-Type: application/json" -d '{"status":"approved"}'` |
| 駁回審核 | `PATCH /api/openclaw/reviews/:id` | `curl -X PATCH http://localhost:3001/api/openclaw/reviews/r1 -H "Content-Type: application/json" -d '{"status":"rejected"}'` |
| 啟用/停用自動化 | `PATCH /api/openclaw/automations/:id` | `curl -X PATCH http://localhost:3001/api/openclaw/automations/a1 -H "Content-Type: application/json" -d '{"active":true}'` |
| 刪除任務 | `DELETE /api/openclaw/tasks/:id` | `curl -X DELETE http://localhost:3001/api/openclaw/tasks/t1` |
| 重啟 Gateway | `POST /api/openclaw/restart-gateway` | `curl -X POST http://localhost:3001/api/openclaw/restart-gateway` |

### 3.5 OpenClaw Agent 自動啟動

OpenClaw Agent（Cursor Composer、n8n 流程等）需另行設定：

1. **Cursor**：透過 Rules / 專案設定讓 Agent 定期檢查 `/cursor` 頁面
2. **n8n**：Cron 觸發 → 開啟瀏覽器 / 呼叫 API → 執行任務

---

## 四、端點總覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/openclaw/tasks` | 任務列表 |
| POST | `/api/openclaw/tasks` | 建立任務 |
| PATCH | `/api/openclaw/tasks/:id` | 更新任務 |
| DELETE | `/api/openclaw/tasks/:id` | 刪除任務 |
| POST | `/api/openclaw/tasks/:id/run` | 執行指定任務 |
| POST | `/api/openclaw/run-next` | 自動執行下一個 queued 任務 |
| POST | `/api/openclaw/restart-gateway` | 重啟 OpenClaw Gateway（看板按鈕觸發） |
| GET | `/api/openclaw/reviews` | 審核列表 |
| PATCH | `/api/openclaw/reviews/:id` | 更新審核（含 status: approved/rejected） |
| GET | `/api/openclaw/automations` | 自動化列表 |
| PATCH | `/api/openclaw/automations/:id` | 更新自動化（含 active） |
| GET | `/api/tasks` | 主應用任務列表 |
| POST | `/api/tasks/:taskId/run` | 主應用執行任務 |
