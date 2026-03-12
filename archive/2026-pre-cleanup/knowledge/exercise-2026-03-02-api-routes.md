# 練習 A-1：OpenClaw Task Routes 分析

> 日期：2026-03-02
> 來源：server/src/routes/openclaw-tasks.ts

## API 端點清單

該檔案定義了 /api/openclaw/tasks 下的路由，負責任務板的 CRUD 操作。

| Method | Path | 功能描述 | 關鍵邏輯 |
|--------|------|----------|----------|
| GET | / | 獲取任務列表 | 執行 mapToBoard 函數，將 DB 狀態 (queued, in_progress) 映射為看板狀態 (ready, running)，並解析 result JSON 提取品質分數 (qualityScore)。 |
| POST | / | 建立新任務 | (推測) 呼叫 upsertOpenClawTask，並使用 scanTaskPayload 進行 Prompt Injection 防護。 |
| PATCH | /:id | 更新任務 | 更新任務狀態或內容。 |
| DELETE | /:id | 刪除任務 | 移除指定的任務。 |

## 狀態映射細節 (OC_STATUS_TO_BOARD)

為了適應前端 Kanban 的顯示邏輯，後端在 GET 時做了即時轉換：
- queued (DB) → ready (UI)
- in_progress (DB) → running (UI)
- done (DB) → done (UI)

## 依賴模組
- openclawSupabase.ts: 處理實際的 DB 交互。
- openclawMapper.ts: 處理 Task 型別與 DB Schema 的欄位轉換。
- promptGuard.ts: 負責輸入內容的安全掃描。