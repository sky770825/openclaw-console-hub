# n8n 一鍵用法

## 安全提醒

如果你們會在外部平台（含 AI agent 平台）討論/協作，先看：`docs/SECURITY-RULES.md`

## Daily Wrap-up（Telegram, 0 Token）

每天 23:00 自動抓任務板資料並送出一則 Wrap-up 到 Telegram：

- ✅ 今天完成
- ⛔ 卡點/阻塞
- 📌 明天计划

對應 workflow 檔案：

- 專案內：`docs/n8n/Daily-Wrap-up.no-llm.json`
- n8n production（本機）：`~/n8n-production/workflows/Daily-Wrap-up.no-llm.json`

必要環境變數（由 n8n 容器讀取）：

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TASKBOARD_BASE_URL=http://host.docker.internal:3011
OPENCLAW_API_KEY=...
```

重要設定（避免踩坑）：

- `Fetch Tasks` / `Fetch Stats`：HTTP Request node 勾 `Full Response = true`（確保輸出是 object，body 才能是 array）
- `Build Wrap-up Message`：Code node 使用 `runOnceForAllItems`，且必須回傳 `[{ json: { ... } }]`（避免 `A 'json' property isn't an object`）

常見問題：

- `The service is receiving too many requests from you` / `請求過於頻繁`
  - 代表 Taskboard API (`:3011`) 觸發 rate limit；手動測試別連點太快
  - 開發環境可先重啟 `:3011` 的服務再測

## 第一步：在專案根目錄的 `.env` 裡加兩行

```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=你的JWT
```

（JWT 在 n8n 畫面右上 **設定 → API** 裡建立。）

---

## 第二步：執行

```bash
./scripts/n8n
```

就這樣。會幫你**手動觸發「Run Index 報到 Telegram」**一次。

---

## 其他指令（選用）

| 指令 | 說明 |
|------|------|
| `./scripts/n8n` | 觸發 Run Index 報到 Telegram（預設） |
| `./scripts/n8n list` | 列出所有 workflow |
