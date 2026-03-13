# n8n 工作流設計

> 依此設計在 n8n（https://andy825lay.zeabur.app）建立工作流，與 OpenClaw 任務板串接。

**前置**：任務板後端 API 需可被 n8n 存取。本機開發時可用 ngrok 等工具暴露；正式環境請填寫部署後的 API 網址。

| 變數 | 說明 | 範例 |
|------|------|------|
| `TASKBOARD_API` | 任務板後端 API 根網址 | `http://localhost:3011` 或 `https://your-api.zeabur.app` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token（選填） | 從 @BotFather 取得 |

---

## 工作流 1：排程執行下一個任務

**用途**：定時呼叫任務板 API，自動執行第一個 queued 任務。

### 節點結構

| 順序 | 節點類型 | 設定 |
|------|----------|------|
| 1 | **Schedule Trigger** | Interval: Every 5 minutes（或 Cron: `*/5 * * * *`） |
| 2 | **HTTP Request** | Method: POST<br>URL: `{{$env.TASKBOARD_API}}/api/openclaw/run-next`<br>Options → Timeout: 30000 |
| 3 | **IF**（選填） | 條件：`{{ $json.ok === true }}`，成功時可接 Telegram 通知 |
| 4 | **Telegram**（選填） | 成功時發送：「已執行任務 {{ $json.taskId }}」 |

### 快速建立

1. 新增工作流，名稱：「排程執行下一個任務」
2. 加入 **Schedule Trigger**，設為每 5 分鐘
3. 加入 **HTTP Request**：
   - URL: `https://你的任務板API/api/openclaw/run-next`
   - Method: POST
   - Body Content Type: JSON
4. 儲存並啟動

### Webhook 觸發版（供外部呼叫）

若希望由任務板或 cron 觸發，可改用 **Webhook** 作為第一個節點：

1. 第一個節點改為 **Webhook**
2. HTTP Method: POST
3. Path: `run-next`（完整 URL 會是 `https://andy825lay.zeabur.app/webhook/run-next`）
4. 後續接上述 HTTP Request 節點
5. 在任務板 `.env` 設定：`N8N_WEBHOOK_RUN_NEXT=https://andy825lay.zeabur.app/webhook/run-next`

---

## 工作流 2：Telegram 審核指令路由

**用途**：使用者傳送 `/approve r1`、`/reject r2` 時，更新審核狀態並回覆。

### 節點結構

| 順序 | 節點類型 | 設定 |
|------|----------|------|
| 1 | **Telegram Trigger** | 需先設定 Telegram Credentials，取得 Bot Token |
| 2 | **Code** (或 Switch) | 解析 `message.text`：`/approve r1` → action=approve, id=r1；`/reject r2` → action=reject, id=r2 |
| 3 | **IF** | 分岐：action === 'approve' / 'reject' |
| 4a | **HTTP Request** (批准) | PATCH `{{TASKBOARD_API}}/api/openclaw/reviews/{{ $json.id }}`，Body: `{"status":"approved"}` |
| 4b | **HTTP Request** (駁回) | PATCH `{{TASKBOARD_API}}/api/openclaw/reviews/{{ $json.id }}`，Body: `{"status":"rejected"}` |
| 5 | **Telegram** | 回傳結果給使用者 |

### Code 節點範例（解析指令）

```javascript
const text = $input.first().json.message?.text || '';
const match = text.match(/^\/(approve|reject)\s+(\w+)/);
if (!match) return [];
return [{ json: { action: match[1], id: match[2] } }];
```

---

## 工作流 3：任務狀態查詢（Telegram /status）

**用途**：使用者傳送 `/status` 時，取得任務列表並回傳摘要。

### 節點結構

| 順序 | 節點類型 | 設定 |
|------|----------|------|
| 1 | **Telegram Trigger** | 同上 |
| 2 | **IF** | `message.text === '/status'` |
| 3 | **HTTP Request** | GET `{{TASKBOARD_API}}/api/openclaw/tasks` |
| 4 | **Code** | 整理回傳格式：queued / in_progress / done 數量與簡要列表 |
| 5 | **Telegram** | 回傳整理後的訊息 |

---

## 工作流 4：OpenClaw 結果寫入（Webhook 接收）

**用途**：OpenClaw Agent 或外部系統完成任務後，POST 到 n8n，由 n8n 寫入任務板或 Supabase。

### 節點結構

| 順序 | 節點類型 | 設定 |
|------|----------|------|
| 1 | **Webhook** | POST，Path: `openclaw-result` |
| 2 | **HTTP Request** | POST `{{TASKBOARD_API}}/api/openclaw/tasks`，Body: 來自 Webhook 的 `body` |
| 3 | **IF**（選填） | 若需通知 Telegram，可接 Telegram 節點 |

**Body 範例**：
```json
{
  "id": "oc-xxx",
  "title": "任務標題",
  "status": "done",
  "progress": 100,
  "thought": "完成摘要"
}
```

---

## 工作流 5：告警推送（Critical 審核項目）

**用途**：定期檢查 critical 等級的待審核項目，若有則推送 Telegram 告警。

### 節點結構

| 順序 | 節點類型 | 設定 |
|------|----------|------|
| 1 | **Schedule Trigger** | 每 15 分鐘 |
| 2 | **HTTP Request** | GET `{{TASKBOARD_API}}/api/openclaw/reviews` |
| 3 | **Code** | 篩選 `status===pending` 且 `pri==='critical'` |
| 4 | **IF** | 若有資料才繼續 |
| 5 | **Telegram** | 發送告警訊息 |

---

## 環境變數建議

在 n8n 的 **Settings → Variables** 或工作流層級變數中設定：

| 變數名 | 值 |
|--------|-----|
| `TASKBOARD_API` | `http://localhost:3011`（本機）或部署後的 API URL |
| `TELEGRAM_BOT_TOKEN` | 從 @BotFather 取得（若有 Telegram 流程） |

---

## 建置順序建議

1. **工作流 1**（排程 run-next）— 先完成，驗證與任務板連線
2. **工作流 4**（Webhook 接收）— 供外部觸發與寫入
3. **工作流 2、3**（Telegram）— 需先建立 Telegram Bot
4. **工作流 5**（告警）— 可選

---

## JSON 匯入檔

可直接匯入的 n8n 工作流 JSON 位於 `n8n-workflows/`：

- `1-run-next-schedule.json` — 排程執行下一個任務
- `2-run-next-webhook.json` — Webhook 觸發 run-next
- `3-openclaw-result-webhook.json` — OpenClaw 結果寫入任務板

n8n 右上角選單 → **Import from File** 選擇對應 JSON。

---

## 相關文件

- [N8N-INTEGRATION.md](./N8N-INTEGRATION.md) — n8n 環境設定與 API 說明
- [OPENCLAW-INTEGRATION.md](./OPENCLAW-INTEGRATION.md) — 任務板 API 總覽
- [n8n-workflows/README.md](../n8n-workflows/README.md) — JSON 匯入說明
