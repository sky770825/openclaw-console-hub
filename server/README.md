# OpenClaw 後端（API Server）

提供 REST API 給中控台使用，實作 `docs/API-INTEGRATION.md` 規格。資料為 **in-memory**（重啟清空），種子與前端 T-01..T-15 對齊。

## 快速開始

```bash
cd server
npm install
npm run dev
```

API 預設跑在 **http://localhost:3011**（可用 `PORT=` 覆蓋）。

## 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/tasks | 任務列表 |
| GET | /api/tasks/:id | 單一任務 |
| PATCH | /api/tasks/:id | 更新任務 |
| GET | /api/runs | 執行列表（可加 ?taskId=xxx） |
| GET | /api/runs/:id | 單一執行 |
| POST | /api/tasks/:taskId/run | **立即執行**（模擬約 1.5 秒後完成） |
| POST | /api/runs/:id/rerun | 重跑 |
| GET | /api/alerts | 警報列表 |
| PATCH | /api/alerts/:id | 更新警報 |
| GET | /api/health | 健康檢查 |

## 中控台接上此後端

1. 啟動此 server：`npm run dev`（port 3011）
2. 在專案**根目錄**（openclaw-console-hub-main）建立 `.env`：
   ```env
   VITE_API_BASE_URL=http://localhost:3011
   ```
3. 啟動中控台：`npm run dev`（port 3009）
4. 打開 http://localhost:3009 ，點「立即執行」會打此後端，Run 會從 queued → running → success（模擬）。

## 環境變數

- `PORT`：API 埠號，預設 3011
