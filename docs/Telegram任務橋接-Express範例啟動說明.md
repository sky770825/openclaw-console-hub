# Telegram 任務橋接 Express 範例啟動說明

範例檔（僅供參考，不會被任何服務自動執行）：

- `scripts/telegram-task-bridge-example.js`

## 1) 安裝依賴

```bash
npm install express
```

## 2) 設定環境變數

```bash
export PORT=3100
export TASK_API_BASE=http://localhost:3011
export WEBHOOK_SECRET='replace-with-strong-secret'
export TELEGRAM_BOT_TOKEN='123456:your_bot_token'
```

## 3) 啟動

```bash
node scripts/telegram-task-bridge-example.js
```

健康檢查：

```bash
curl http://localhost:3100/healthz
```

## 4) Telegram 指令格式

```text
#task 新增 | title=每日營收彙整 | goal=整理昨日營收並回報 | due=2026-02-10 18:00 | priority=high
#task 執行 | id=task_123
#task 重跑 | run=run_456
#task 查詢 | id=task_123
#task 列表 | status=queued
```

## 5) Webhook 驗簽 Header

- `X-OC-Timestamp`
- `X-OC-Nonce`
- `X-OC-Signature` (`sha256=<hex>`)

簽章字串：

`<timestamp>.<nonce>.<raw_body>`

## 6) 已實作錯誤碼

- `E1001` 指令前綴錯誤
- `E1002` 不支援動作
- `E1003` 缺必要欄位
- `E1004` 欄位格式錯誤
- `E1005` priority 非法
- `E2001` 任務 API timeout/網路錯誤
- `E2002` 任務 API HTTP 錯誤
- `E3001` webhook 驗簽失敗
- `E3002` webhook timestamp 過期
- `E3003` webhook nonce 重放
- `E5001` 內部錯誤

## 7) 注意

- 此檔是示例橋接層；接到正式環境時，建議把 nonce cache 改成 Redis。
- `PATCH /api/runs/:id` 的實際欄位請以你的任務板 API 定義為準。
