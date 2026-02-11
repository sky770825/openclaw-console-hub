# OpenClaw 沒反應 / Telegram 沒訊息 — 排查說明

## 一、OpenClaw 任務板「沒反應」

通常代表：**前端打不到後端 API**，畫面空白或按鈕無效。

### 1. 確認後端有在跑

在終端執行（若你設定了 `PORT` 請改成實際 port，例如 3011）：

```bash
curl -sS http://127.0.0.1:3001/api/health
```

- **有回** `{"ok":true,"service":"openclaw-server"}` → 後端正常，跳到步驟 2。
- **連線被拒 / 沒反應** → 後端沒啟動或 port 不對。

**啟動後端：**

```bash
cd server
npm run build
# 若 .env 有 PORT=3011，則後端會聽 3011；沒有則預設 3001
node dist/index.js
```

看到 `OpenClaw API http://localhost:3001`（或你的 PORT）才算啟動成功。

### 2. 前端的 API 要指到後端

- **開發時**：前端用 Vite proxy，`/api` 會轉到 `vite.config.ts` 裡的 `target`（目前是 `http://localhost:3001`）。
- 若你後端是 **3011**，請改 `vite.config.ts` 的 proxy target 為 `http://localhost:3011`。
- 或設定 **同源**：不設 `VITE_API_BASE_URL`，讓前端和後端同一個 origin（靠 proxy），這樣就不會打錯。

### 3. API Key（若後端有開驗證）

後端若設了 `OPENCLAW_API_KEY` 且 `OPENCLAW_ENFORCE_WRITE_AUTH=true`，**寫入**（執行任務、儲存等）都要帶 key。

在**專案根目錄**的 `.env`（給 Vite 用）加上，且與後端 key 一致：

```env
VITE_OPENCLAW_API_KEY=你的OPENCLAW_API_KEY
```

改完要**重開前端**（`npm run dev`）。

### 4. 快速對照

| 狀況           | 可能原因           | 處理方式                          |
|----------------|--------------------|-----------------------------------|
| 畫面空白/無資料 | 後端沒跑           | 啟動 `node dist/index.js`         |
| 畫面空白/無資料 | proxy port 不對    | 改 vite proxy target = 後端 PORT  |
| 按執行後沒反應   | 401 Unauthorized   | 設 `VITE_OPENCLAW_API_KEY`（與後端一致） |
| 按執行後報 503  | 後端未設 API Key   | 後端 .env 設 `OPENCLAW_API_KEY` 或關閉 `OPENCLAW_ENFORCE_WRITE_AUTH` |
| 連線失敗        | 後端未啟動 / port 錯 | 啟動後端、確認 vite proxy target 與後端 PORT 一致 |
| /api/openclaw/projects 回 503 | 後端未連 Supabase | 在後端 .env 設定 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`，並執行 `docs/supabase-openclaw-migration.sql` |

---

## 二、OpenClaw 的 Telegram 沒訊息

**OpenClaw 有自己的 Telegram 整合**：後端會把任務／工作流的狀態（開始、完成、失敗、超時、重試等）發到 Telegram。實作在 `server/src/utils/telegram.ts`。

### 為什麼收不到 OpenClaw 的 Telegram 訊息？

**一定要在後端環境設定 Bot Token 與 Chat ID**，否則程式會**靜默略過**（不發、也不報錯）。

**要做的事：**

1. 在 **server** 用的 `.env`（例如專案根目錄的 `.env` 或 `server/.env`，總之要是 `node dist/index.js` 會讀到的那份）加上：

   ```env
   TELEGRAM_BOT_TOKEN=你的Bot Token
   TELEGRAM_CHAT_ID=你的Chat ID
   ```

2. **Bot Token**：到 [@BotFather](https://t.me/BotFather) 建立 Bot 或使用既有 Bot 的 token。
3. **Chat ID**：  
   - 先對你的 Bot 傳一則訊息，再開：  
     `https://api.telegram.org/bot<你的TOKEN>/getUpdates`  
   - 在 JSON 裡找 `message.chat.id`，即為 Chat ID。  
   - 或使用 [@userinfobot](https://t.me/userinfobot) 取得自己的 ID（私聊時可當 Chat ID）。

4. **重啟後端**，再觸發會發通知的流程（執行任務、超時、失敗等）。  
5. 若仍沒收到：看後端終端是否有 `[Telegram] 未設定 ...`（代表 env 沒被讀到或沒重啟），或 `[Telegram] send failed:`（代表 API 回傳錯誤，可看 status 與內容排查）。

---

## 三、建議檢查順序

1. 後端：`curl http://127.0.0.1:3001/api/health`（或你的 PORT）有回。
2. 前端：Vite proxy 的 target port = 後端實際 PORT。
3. 若要 API 寫入：設 `VITE_OPENCLAW_API_KEY` 並重開前端。
4. 若要 **OpenClaw 的 Telegram 通知**：在後端 .env 設 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`，重啟後端，再觸發任務/超時/失敗等流程。
