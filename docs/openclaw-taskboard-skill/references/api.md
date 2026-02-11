# OpenClaw 任務板 API 規格

Base URL 來自 `OPENCLAW_TASKBOARD_URL`（例：`http://localhost:3001`）。寫入需 `x-api-key`（若後端啟用）。

## 模組與端點對照

| 模組 | 讀取 | 寫入 | 說明 |
|------|------|------|------|
| tasks | GET /api/openclaw/tasks | POST, PATCH, DELETE | 任務 CRUD，含 subs/progress/cat |
| reviews | GET /api/openclaw/reviews | POST, PATCH | 審核項目 |
| automations | GET /api/openclaw/automations | POST, PATCH | 排程自動化 |
| evolution-log | GET /api/openclaw/evolution-log | POST | 進化紀錄（執行/批准/推進等） |
| board-config | GET /api/openclaw/board-config | — | n8n/API/安全/Plugin 展示用，單一資料源 |

## 1. Tasks

- **GET** `/api/openclaw/tasks`  
  回傳陣列，每筆含：id, title, name, subs, progress, status, cat, thought, from_review_id, tags, description, updatedAt, createdAt 等。

- **POST** `/api/openclaw/tasks`  
  Body: `{ name?, title?, tags?, status?, subs?, description? }`  
  回傳同上格式（含 id, title, subs, progress, cat）。

- **PATCH** `/api/openclaw/tasks/:id`  
  Body: 同上，可部分更新。回傳完整任務。

- **DELETE** `/api/openclaw/tasks/:id`  
  永久刪除，204。

- **POST** `/api/openclaw/tasks/:id/run`  
  觸發執行，回傳 run 物件（id, taskId, status, startedAt 等）。執行紀錄另寫一筆 evolution-log（前端 addE）。

- **POST** `/api/openclaw/run-next`  
  執行下一個 queued 任務，回傳 `{ run, taskId }`。

## 2. Reviews

- **GET** `/api/openclaw/reviews`  
  回傳審核陣列（id, title, type, desc, src, pri, status, reasoning, date 等）。

- **POST** `/api/openclaw/reviews`  
  Body: 同上欄位，需 id。

- **PATCH** `/api/openclaw/reviews/:id`  
  Body: 部分欄位。

## 3. Automations

- **GET** `/api/openclaw/automations`  
  回傳陣列（id, name, cron, active, chain, health, runs, last_run 等）。

- **POST** `/api/openclaw/automations`  
- **PATCH** `/api/openclaw/automations/:id`

## 4. Evolution log

- **GET** `/api/openclaw/evolution-log`  
  回傳陣列：id, t, x, c, tag, tc, created_at。

- **POST** `/api/openclaw/evolution-log`  
  Body: `{ t?, x, c?, tag?, tc? }`。用於記錄批准、駁回、推進、執行、刪除、測驗單等。

## 5. Board config（唯讀）

- **GET** `/api/openclaw/board-config`  
  回傳：n8nFlows, apiEndpoints, securityLayers, rbacMatrix, plugins。中控與多任務板共用此端點為單一資料源。

## 同步關係

- 任務／審核／自動化／進化紀錄均寫入 Supabase；儀表板、任務列表、進化紀錄皆從同一 API 讀取，故多版面同步。
- 每次「執行」會在前端呼叫 addE 寫一筆 evolution-log；run 明細目前僅在後端記憶體，未另存 DB。
