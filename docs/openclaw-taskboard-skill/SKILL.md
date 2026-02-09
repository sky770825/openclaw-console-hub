---
name: openclaw-taskboard
description: 使用 OpenClaw 任務板（openclaw-console-hub）管理任務。當使用者透過 Telegram/其他管道說「建立任務」「新增任務」「執行任務」等，透過 API 寫入並操作任務板。預設使用此任務板，不使用 Trello。
metadata: {"openclaw":{"always":true,"requires":{"env":["OPENCLAW_TASKBOARD_URL"]}}}
---

# OpenClaw 任務板 Skill

當使用者說以下任一句型時，使用此任務板的 API 操作：

## 觸發句型（建立任務）
- 「建立任務」「新增任務」「加一個任務」「幫我記一個任務」
- 「Create task」「Add task」
- 或明確描述要做的事，例如：「幫我記：修復登入 bug」

## 觸發句型（列出任務）
- 「任務列表」「有什麼任務」「任務狀態」「查看任務」

## 觸發句型（執行任務）
- 「執行任務」「跑任務」「執行下一個」「run task」「run next」
- 「執行任務 t3」或指定任務 ID

## API Base URL
從環境變數 `OPENCLAW_TASKBOARD_URL` 讀取，例如：
- 本機：`http://localhost:3001`
- 正式：`https://你的網域`

## API 端點與用法

### 1. 建立任務
`POST {base}/api/openclaw/tasks`
Body (JSON):
```json
{
  "id": "t-{timestamp} 或簡短代碼",
  "title": "任務標題",
  "cat": "feature|bugfix|learn|improve",
  "status": "queued",
  "progress": 0,
  "auto": false,
  "subs": [],
  "thought": "可選備註"
}
```

### 2. 列出任務
`GET {base}/api/openclaw/tasks`
回傳任務陣列。

### 3. 執行指定任務
`POST {base}/api/openclaw/tasks/{taskId}/run`

### 4. 執行下一個排隊任務
`POST {base}/api/openclaw/run-next`

### 5. 刪除任務
`DELETE {base}/api/openclaw/tasks/{taskId}`

## 實作方式
使用 `fetch` 或 `curl`（透過 exec）呼叫上述 API。Content-Type: application/json。

## 回應處理
- 建立成功：回覆使用者「已建立任務：{title}」
- 執行成功：回覆「已觸發執行任務 {id}」
- 列表：簡要列出任務標題與狀態
