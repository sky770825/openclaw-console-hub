# Telegram + OpenClaw 設定步驟

照下面順序做，完成後在 Telegram 傳 `/status` 或 `/approve r1` 就會有回覆。

---

## 一、取得 Telegram Bot Token

1. 在 Telegram 搜尋 **@BotFather**，開聊。
2. 傳送 `/newbot`，依指示取名字、取 username（結尾要 `bot`，例如 `myopenclaw_bot`）。
3. BotFather 會給你一組 **Token**（長得像 `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）。
4. 複製保存，下一步會貼到 n8n。

---

## 二、在 n8n 設定

你的 n8n 網址：**https://andy825lay.zeabur.app**

### 步驟 1：新增 Telegram 憑證

1. 登入 n8n → 左上 **☰** → **Settings** → **Credentials**。
2. 點 **Add Credential**，搜尋並選 **Telegram API**。
3. **Access Token** 貼上剛才的 Bot Token。
4. 取名（例如「OpenClaw Bot」）→ **Save**。

### 步驟 2：設定 TASKBOARD_API 變數

n8n 在 Zeabur 上，**無法連你電腦的 localhost**，所以要填「任務板後端對外的網址」：

| 情境 | TASKBOARD_API 填什麼 |
|------|----------------------|
| **任務板已部署到 Railway** | 填 Railway 網址（**不要結尾斜線**），例如 `https://xiaojicai-production.up.railway.app` |
| **任務板後端已部署到 Zeabur** | 你的後端網址，例如 `https://你的專案-api.zeabur.app` |
| **只有本機在跑（localhost:3009）** | 用 [ngrok](https://ngrok.com/) 暴露：`ngrok http 3009`，把出現的 `https://xxx.ngrok-free.app` 填進去 |

在 n8n：

1. **Settings** → **Variables**。
2. 新增變數：名稱 **`TASKBOARD_API`**，值為上面選的網址（**不要結尾斜線**）。  
   - 若用 Railway：`https://xiaojicai-production.up.railway.app`
3. 儲存。

### 步驟 3：匯入 Telegram 工作流

1. n8n 左上 **Workflows**，右上 **⋮** → **Import from File**。
2. 選專案裡的：
   - `n8n-workflows/4-telegram-approve-reject.json`
   - `n8n-workflows/5-telegram-status.json`
3. 各匯入一次（或複製 JSON 內容貼上），會出現兩個新工作流。

### 步驟 4：綁定 Telegram 憑證

每個匯入的工作流都要設一次：

1. 點開工作流「**Telegram 審核指令**」：
   - 點 **Telegram Trigger** 節點 → **Credential to connect with** 選你剛建的 Telegram 憑證。
   - 點 **回覆批准**、**回覆駁回** 節點 → 同樣選同一組 Telegram 憑證。
2. 點開工作流「**Telegram 任務狀態（/status）**」：
   - **Telegram Trigger**、**回覆狀態** 節點 → 都選同一組 Telegram 憑證。
3. 每個工作流右上 **Save**。

### 步驟 5：啟動工作流

1. 在「Telegram 審核指令」畫面右上，把開關切到 **Active**（綠色）。
2. 在「Telegram 任務狀態」畫面右上，同樣切到 **Active**。

---

## 三、在 Telegram 測試

1. 在 Telegram 搜尋你的 Bot（username），點 **Start** 或傳任意訊息開聊。
2. 傳 **`/status`** → 應收到任務摘要回覆。
3. 若有審核項目（例如 id 為 `r1`），傳 **`/approve r1`** 或 **`/reject r1`** → 應收到「已批准」或「已駁回」回覆。

---

## 四、本機開發時讓 n8n 連到 localhost（可選）

若任務板後端只跑在本機（`npm run dev:server` 在 port 3009）：

1. 安裝 ngrok：`brew install ngrok` 或從 https://ngrok.com 下載。
2. 終端執行：`ngrok http 3009`。
3. 畫面會顯示一行 **Forwarding** `https://xxxx.ngrok-free.app` → `http://localhost:3009`。
4. 在 n8n 的變數 **TASKBOARD_API** 填你的 ngrok 網址，例如 `https://2037-1-164-19-155.ngrok-free.app`（每次重開 ngrok 網址可能不同，需更新）。
5. 本機後端記得保持運行，ngrok 關掉後 n8n 就連不到了。

之後若改為把後端部署到 Zeabur，把 **TASKBOARD_API** 改成部署後的 API 網址即可。

---

## 五、檢查清單

- [ ] Bot Token 已從 @BotFather 取得
- [ ] n8n 已新增 Telegram API 憑證並貼上 Token
- [ ] n8n 變數 **TASKBOARD_API** 已填（且 n8n 能連到該網址）
- [ ] 已匯入 `4-telegram-approve-reject.json` 與 `5-telegram-status.json`
- [ ] 兩個工作流裡的 Telegram 節點都已選好同一組憑證
- [ ] 兩個工作流都已 **Save** 且設為 **Active**
- [ ] 在 Telegram 對 Bot 傳過 `/status` 或 `/approve xxx` 測試

若仍沒回覆，可看 [TELEGRAM-NO-REPLY.md](./TELEGRAM-NO-REPLY.md) 排查。
