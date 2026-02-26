# Telegram 不會回覆 — 排查指南

Telegram 的「回覆」是在 **n8n** 裡完成的，不是任務板後端。使用者傳 `/approve`、`/reject`、`/status` 時，n8n 的 **Telegram Trigger** 收到訊息 → 呼叫任務板 API → 最後要用 **Telegram 節點** 把結果「送回去」同一個聊天室。

---

## 一、常見原因總覽

| 原因 | 說明 |
|------|------|
| **沒有建立 Telegram 工作流** | 專案附的 JSON 只有 run-next、openclaw-result，**沒有**「Telegram 審核指令」或「/status」的現成流程，需在 n8n 手動建或匯入範例 |
| **流程裡沒有「回覆」節點** | 流程末端必須有 **Telegram → Send Message**（或等同節點），且要帶入 **Chat ID**（從 Trigger 的 `message.chat.id` 來），否則 Bot 不會回任何訊息 |
| **Telegram Credentials 未設** | n8n 的 Telegram 節點需要 **Bot Token**（@BotFather 取得），沒設或填錯就不會發送 |
| **TASKBOARD_API 連不到** | n8n 在 Zeabur，若 `TASKBOARD_API` 填 `http://localhost:3009`，n8n 打不到你本機，API 失敗後通常也不會執行到「回覆」那一步 |
| **工作流未啟動** | n8n 工作流要 **Active**，Telegram Trigger 才會收訊息並往下跑 |
| **Chat ID 沒帶對** | 回覆時必須用「收到訊息的那個 chat」：`{{ $('Telegram Trigger').first().json.message.chat.id }}`（或你 Trigger 節點的名稱） |

---

## 二、檢查清單（依序做）

### 1. 確認有「會回覆」的 Telegram 工作流

- 在 n8n 裡要有 **Telegram Trigger** 開頭、且最後接 **Telegram 發送訊息** 的流程。
- 對應設計： [N8N-WORKFLOW-DESIGN.md](./N8N-WORKFLOW-DESIGN.md) 的 **工作流 2（審核指令）**、**工作流 3（/status）**。

### 2. 檢查 Telegram 節點是否會「真的發送」

- 最後一個（或分支最後）節點類型：**Telegram** → **Send Message**（或等同）。
- **Chat ID** 必須有值：
  - 用觸發的聊天：`{{ $('Telegram Trigger').first().json.message.chat.id }}`
  - 若你的 Trigger 節點名稱不同，把 `Telegram Trigger` 改成該名稱。
- **Text**：要填你要回覆的內容（例如「已批准 r1」、或 Code 節點輸出的 `$json.reply`）。

### 3. 檢查 Telegram Credentials

- n8n：**Settings → Credentials**（或節點內選 Credentials）。
- 新增/編輯 **Telegram API**，貼上 @BotFather 給的 **Bot Token**。
- 儲存後在 Telegram 節點選這組 Credentials。

### 4. 檢查 TASKBOARD_API 是否可達

- n8n 在 **Zeabur** 時，不能填 `http://localhost:3009`（n8n 伺服器上沒有你的本機）。
- 請填 **任務板後端對外網址**（例如 `https://your-api.zeabur.app` 或 ngrok 網址）。
- 在 n8n 用 **HTTP Request** 節點手動打一次 `GET {{TASKBOARD_API}}/api/health` 確認可通。

### 5. 工作流是否已啟動

- n8n 編輯畫面右上角開關要為 **Active**（綠色）。
- 只有 Active 的流程，Telegram Trigger 才會接訊息並執行。

### 6. 看 n8n 執行紀錄

- **Executions** 裡看該工作流是否有被觸發（你傳指令的那個時間點）。
- 若 **有觸發但失敗**：看錯誤訊息（常是 TASKBOARD_API 連線失敗、或 Body/路徑錯誤）。
- 若 **完全沒觸發**：多半是 Trigger 沒設好、或工作流沒 Active、或 Bot Token 錯。

---

## 三、回覆節點怎麼接才對（重點）

設計文件裡寫的「5 | **Telegram** | 回傳結果給使用者」指的是：

1. **有一節點** 類型為 **Telegram**，動作選 **Send Message**。
2. **Chat ID**：從「觸發這次執行的 Telegram 訊息」來，例如  
   `{{ $('Telegram Trigger').first().json.message.chat.id }}`
3. **Text**：  
   - 可直接寫固定文，例如「已批准」；或  
   - 用前面 **Code** / **HTTP Request** 的輸出，例如 `{{ $json.message || '完成' }}`，這樣 API 回傳的內容才會真的回給使用者。

若流程裡 **沒有** 這個 Telegram 發送節點、或 Chat ID 為空，Bot 就不會回覆。

---

## 四、建議修正步驟（摘要）

1. **在 n8n 建立或匯入「Telegram 審核 + /status」工作流**（可參考 `n8n-workflows/` 下若有 Telegram 範例 JSON，或依 N8N-WORKFLOW-DESIGN.md 手動建）。
2. **在流程末端加上 Telegram → Send Message**，Chat ID 用上面寫的 expression，Text 用 API/Code 的結果。
3. **設定 Telegram Credentials**（Bot Token）。
4. **TASKBOARD_API 改為 n8n 能連到的任務板 API 網址**，並確認可連。
5. **儲存並將工作流設為 Active**，再在 Telegram 傳一次 `/status` 或 `/approve r1` 測試。

若你願意，我可以再幫你寫一個「可匯入的 Telegram 審核 + /status 工作流 JSON」範例，你匯入後只要填 Bot Token 和 TASKBOARD_API 即可測試回覆。
