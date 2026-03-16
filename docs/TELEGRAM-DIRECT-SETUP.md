# Telegram 直連 OpenClaw（不經 n8n）

後端直接接收 Telegram 訊息、解析指令並回覆，不需透過 n8n。

---

## 一、取得 Bot Token

1. Telegram 搜尋 **@BotFather** → 傳送 `/newbot`。
2. 依指示取名字與 username（結尾需 `bot`）。
3. 複製 Bot Father 給的 **Token**（例如 `7123456789:AAHxxx...`）。

---

## 二、設定後端

1. 在專案根目錄 **`.env`** 新增（或貼上）：
   ```env
   TELEGRAM_BOT_TOKEN=你的Token
   ```
2. 重啟後端（例如 `cd server && npm run dev`，或 Railway 重新部署）。

---

## 三、向 Telegram 註冊 Webhook

後端必須有**對外網址**（例如 Railway），Telegram 才會把訊息推過來。

把下面網址的 `你的後端網址` 換成實際網址（**不要結尾斜線**），在瀏覽器打開一次即可完成註冊：

```text
https://api.telegram.org/bot<你的Token>/setWebhook?url=你的後端網址/api/webhook/telegram
```

**範例**（Railway 部署）：

```text
https://api.telegram.org/bot7123456789:AAHxxx.../setWebhook?url=https://xiaojicai-production.up.railway.app/api/webhook/telegram
```

成功時 Telegram 會回傳：`{"ok":true,"result":true,"description":"Webhook was set"}`。

---

## 四、支援的指令

| 指令 | 說明 |
|------|------|
| `/status` | 回傳任務摘要（排隊／進行中／完成數與最近任務） |
| `/approve <id>` | 批准審核項目（例如 `/approve r1`） |
| `/reject <id>` | 駁回審核項目（例如 `/reject r2`） |

資料來源為 OpenClaw 後端（Supabase 的 openclaw_tasks、openclaw_reviews）。

---

## 五、取消 Webhook（改回 n8n 時）

若要改回用 n8n 收 Telegram，先刪除目前 webhook：

```text
https://api.telegram.org/bot<你的Token>/deleteWebhook
```

再在 n8n 裡重新啟動含 Telegram Trigger 的工作流即可。
