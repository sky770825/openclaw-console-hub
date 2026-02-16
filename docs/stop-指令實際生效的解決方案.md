# /stop 指令實際生效的解決方案

OpenClaw 回覆但你發現任務沒有真的被終止时，通常是因為 **Skill 只是說明**，OpenClaw 沒有真正去呼叫 API。以下是幾種可讓 /stop **實際執行**的方式。

---

## 方案一：專用 Telegram Bot + 輪詢（推薦，免 webhook）

**用第二個 bot 專門處理 /stop，後端自動輪詢，不需設定 webhook。**

### 步驟（3 步搞定）

1. **建立第二個 bot**
   - 在 Telegram 找 @BotFather → `/newbot` → 建立例如 `@YourStopBot` → 取得 token

2. **在 `.env` 加一行**
   ```env
   TELEGRAM_STOP_BOT_TOKEN=你的第二個bot的token
   ```

3. **重啟後端**
   ```bash
   cd server && npm run dev
   ```
   看到 `[TelegramStop] 已啟動` 即表示成功。

4. **使用**
   - 對 `@YourStopBot` 發送 `/stop` 或 `停止`
   - 後端會**立刻**終止任務並回覆

**不需要** ngrok、webhook、setWebhook，設定好就能用。

---

## 方案一（備選）：Webhook 方式

若你偏好用 webhook（例如已部署到 Railway）：

1. 設定 `TELEGRAM_STOP_BOT_TOKEN`
2. 執行：
   ```bash
   curl -X POST "https://api.telegram.org/bot<STOP_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://你的後端網址/api/telegram/webhook"}'
   ```

---

## 方案二：主 bot 的 webhook 指向後端

**若你願意把 OpenClaw 用的主 bot 的 webhook 改指向後端：**

- `/stop` 會由後端處理並真的終止
- **缺點**：OpenClaw 可能收不到其他訊息（webhook 只能一個）

### 步驟

1. 在 `.env` 確保有 `TELEGRAM_BOT_TOKEN`
2. 設定 webhook：
   ```bash
   curl -X POST "https://api.telegram.org/bot<你的TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://你的後端網址/api/telegram/webhook"}'
   ```
3. 對主 bot 發送 `/stop` 即可終止

若要恢復 OpenClaw 正常運作，清除 webhook：
```bash
curl -X POST "https://api.telegram.org/bot<token>/deleteWebhook"
```

---

## 方案三：本機手動執行腳本

**不透過 Telegram，直接在本機執行：**

```bash
cd /path/to/openclaw任務面版設計
TASK_BOARD_API_BASE=http://localhost:3011 ./scripts/emergency-stop.sh
# 或
./scripts/emergency-stop.sh all
./scripts/emergency-stop.sh list   # 先看執行中的任務
```

---

## 方案四：讓 OpenClaw 用 exec 執行腳本

**若 OpenClaw 有 exec tool，可透過 Skill 觸發腳本：**

1. 把 `emergency-stop.sh` 放到 OpenClaw 的 workspace：
   ```bash
   cp scripts/emergency-stop.sh ~/.openclaw/workspace/scripts/
   ```

2. 在 Skill 裡寫清楚：當用戶說「/stop」或「停止」時，執行 `./scripts/emergency-stop.sh` 或 `bash scripts/emergency-stop.sh`。

3. 確認 `OPENCLAW_TASKBOARD_URL` 或 `TASK_BOARD_API_BASE` 指向正確後端（如 `http://localhost:3011`）。

**注意**：OpenClaw 必須真的會執行該指令，若只回覆文字而不執行，此方案無效。

---

## 方案五：n8n 中介

**用 n8n 接收 Telegram，判斷 /stop 後打 API：**

1. n8n 建立 Telegram Trigger 接收訊息
2. 用 IF 判斷 `/stop` 或 `停止`
3. 為真時用 HTTP Request 打 `POST https://你的後端/api/emergency/stop-all`
4. 再回覆到 Telegram

---

## 對照表

| 方案 | 優點 | 缺點 |
|------|------|------|
| 一、專用 bot | 不影響 OpenClaw，最穩定 | 需多一個 bot |
| 二、主 bot webhook | 只改 webhook 即可 | OpenClaw 可能收不到其他訊息 |
| 三、本機腳本 | 最簡單、直接 | 不能從 Telegram 觸發 |
| 四、OpenClaw exec | 若可行，可從同一對話觸發 | 依賴 OpenClaw 真的執行 |
| 五、n8n | 彈性高 | 需額外設定 n8n |

---

## 本專案已實作

- **後端**：`POST /api/telegram/webhook` 會處理 `/stop`、`/stop all`、`停止`、`緊急終止`
- **環境變數**：`TELEGRAM_STOP_BOT_TOKEN`（建議用專用 bot）或 `TELEGRAM_BOT_TOKEN`
- **腳本**：`scripts/emergency-stop.sh` 可本機直接呼叫
