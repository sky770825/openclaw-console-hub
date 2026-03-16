# Telegram 任務指令 Parser 與 Webhook 驗簽規格

## 1) 目標

- 讓使用者在 Telegram 以單行指令交辦任務。
- OpenClaw 解析後呼叫任務板 API（建立、執行、重跑、查詢）。
- OpenClaw/n8n 透過 webhook 回寫執行結果到資料庫。
- webhook 需有驗簽與防重放（replay attack）機制。

---

## 2) 指令語法（可直接上線版本）

統一格式：

`#task <動作> | key=value | key=value ...`

支援動作：

- `新增`
- `執行`
- `重跑`
- `查詢`
- `列表`

範例：

```text
#task 新增 | title=每日營收彙整 | due=2026-02-10 18:00 | priority=high | assignee=openclaw | goal=整理昨日營收並回報
#task 執行 | id=task_123
#task 重跑 | run=run_456
#task 查詢 | id=task_123
#task 列表 | status=queued
```

---

## 3) Parser 規則

## 3.1 前處理

- 去除前後空白。
- 僅接受以 `#task` 開頭的訊息。
- 分隔符號用 `|`（容許左右空白）。
- key 使用小寫英數與底線：`[a-z0-9_]+`。

## 3.2 解析流程

1. 先切出動作：`#task <action>`
2. 其餘欄位以 `|` 切段，再以第一個 `=` 切成 `key` 和 `value`
3. key 正規化為小寫；value 保留原文（再做型別驗證）
4. 依 action 驗證必要欄位

## 3.3 必填欄位

- `新增`：`title`、`goal`
- `執行`：`id`
- `重跑`：`run`
- `查詢`：`id`
- `列表`：可空（可帶 `status`）

## 3.4 欄位型別驗證

- `priority`：`low|normal|high|urgent`
- `due`：可解析時間，建議轉成 ISO 8601（例：`2026-02-10T18:00:00+08:00`）
- `id`：`task_` 前綴（建議）
- `run`：`run_` 前綴（建議）

---

## 4) Telegram -> Task 欄位映射

- `title -> tasks.title`
- `goal -> tasks.goal`
- `due -> tasks.scheduled_at`
- `priority -> tasks.priority`
- `assignee -> tasks.owner`
- `telegram.chat.id -> tasks.source_chat_id`
- `telegram.from.username or from.id -> tasks.created_by`

---

## 5) API 呼叫規格

- 新增任務：`POST /api/tasks`
- 立即執行：`POST /api/tasks/:taskId/run`
- 重跑：`POST /api/runs/:id/rerun`
- 查詢任務：`GET /api/tasks/:id`
- 查詢列表：`GET /api/tasks?status=queued`

建議 timeout：`10s`；失敗最多重試 `2` 次（指數退避）。

---

## 6) Webhook 驗簽規格（HMAC-SHA256）

## 6.1 Header

- `X-OC-Timestamp`: UNIX seconds
- `X-OC-Nonce`: UUID 或隨機字串
- `X-OC-Signature`: `sha256=<hex>`
- `X-OC-Key-Id`: 簽章金鑰識別（可選，但建議）

## 6.2 簽章字串

`signing_payload = "<timestamp>.<nonce>.<raw_body>"`

`signature = HMAC_SHA256(webhook_secret, signing_payload)`

接收端用同樣方式重算並常數時間比對。

## 6.3 防重放

- 檢查 timestamp 與伺服器時間差 <= 300 秒。
- `nonce` 在 10 分鐘內不可重複（用 Redis/DB 快取）。

## 6.4 驗簽失敗回應

- 回 `401 Unauthorized`
- 不寫入資料、不觸發後續流程。

---

## 7) 結果 webhook payload（建議）

```json
{
  "task_id": "task_123",
  "run_id": "run_456",
  "status": "success",
  "output": "任務摘要結果",
  "error": null,
  "started_at": "2026-02-09T15:15:00Z",
  "finished_at": "2026-02-09T15:20:00Z",
  "meta": {
    "model": "claude-web",
    "source": "openclaw"
  }
}
```

`status` 建議枚舉：`queued|running|success|failed|cancelled`

---

## 8) 錯誤碼表（可直接用）

- `E1001 INVALID_COMMAND_PREFIX`
  - 訊息不是 `#task` 開頭
- `E1002 UNKNOWN_ACTION`
  - 動作不是支援值
- `E1003 MISSING_REQUIRED_FIELD`
  - 缺必要欄位
- `E1004 INVALID_FIELD_FORMAT`
  - 欄位格式錯（如 due 無法解析）
- `E1005 INVALID_PRIORITY`
  - priority 非允許值
- `E2001 API_TIMEOUT`
  - 任務板 API 逾時
- `E2002 API_HTTP_ERROR`
  - 任務板 API 回傳 4xx/5xx
- `E3001 WEBHOOK_SIGNATURE_INVALID`
  - 驗簽不通過
- `E3002 WEBHOOK_TIMESTAMP_EXPIRED`
  - timestamp 超過允許視窗
- `E3003 WEBHOOK_NONCE_REPLAYED`
  - nonce 重放
- `E5001 INTERNAL_ERROR`
  - 其他未預期錯誤

---

## 9) Telegram 回覆模板

- 成功建立：
  - `已建立任務 task_123，預計執行時間 2026-02-10 18:00。`
- 已啟動執行：
  - `任務 task_123 已啟動，run_id=run_456。`
- 執行成功：
  - `任務 task_123 完成。摘要：<output>`
- 執行失敗：
  - `任務 task_123 失敗（E2002）。請稍後重試或輸入 #task 重跑 | run=run_456`

---

## 10) 最小實作建議

1. 先做 `新增/執行/查詢` 三個 action。
2. webhook 先上 HMAC 驗簽 + timestamp 驗證。
3. nonce 防重放可以先用記憶體快取，穩定後改 Redis。
4. 錯誤碼回傳固定格式 JSON，便於前端與 n8n 判斷。

固定錯誤回應格式：

```json
{
  "ok": false,
  "error_code": "E1003",
  "message": "missing field: title"
}
```
