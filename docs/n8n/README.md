# n8n Workflows（OpenClaw）

## 安全提醒

如果你們會在外部平台（含 AI agent 平台）討論/協作，先看：`docs/SECURITY-RULES.md`

## 這個資料夾有什麼

- `Daily-Wrap-up.no-llm.json`
  - 每天 23:00 Telegram 日報（0 token）
- `Daily-Wrap-up.no-llm.with-error-alert.json`
  - 同上，但抓資料失敗也會發 `🚨 FAILED ...`（建議用這個）
- `OpenClaw-Run-Index-Reporter-Telegram.json`
  - 任務完成時，發「索引級摘要」到 Telegram（避免貼全文、省 token）
- `OpenClaw-Run-Index-Reporter-Telegram.code-node.json`
  - 上面那個的 Code Node 版本（相容一些舊 n8n/Code Node 差異）
- `My-workflow.no-llm.json` / `My-workflow.fixed.json`
  - 你們其他流程的匯出檔（依實際命名為準）

## Daily Wrap-up（Telegram, 0 Token）

每天 23:00 自動抓任務板資料並送出一則 Wrap-up 到 Telegram：

- ✅ 今天完成
- ⛔ 卡點/阻塞
- 📌 明天计划

對應 workflow 檔案：

- 建議用：`docs/n8n/Daily-Wrap-up.no-llm.with-error-alert.json`
- 純版本：`docs/n8n/Daily-Wrap-up.no-llm.json`

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

### 匯入與測試（最短路徑）

1. 進 n8n UI：`http://127.0.0.1:5678`
2. `Import` → 選 `docs/n8n/Daily-Wrap-up.no-llm.with-error-alert.json`
3. 在 workflow 右上角按 `Execute Workflow` 測一次（會直接送 Telegram）
4. 沒問題再把 workflow 切 `Active`

常見問題：

- `The service is receiving too many requests from you` / `請求過於頻繁`
  - 代表 Taskboard API (`:3011`) 觸發 rate limit；手動測試別連點太快
  - 開發環境可先重啟 `:3011` 的服務再測

## 用 CLI 觸發 n8n（給工程師用）

這段是「用 n8n API Key 從命令列觸發 workflow」，主要給 `Run Index Reporter` 快速測試用。

### 第一步：在專案根目錄的 `.env` 裡加兩行

```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=你的JWT
```

（JWT 在 n8n 畫面右上 **設定 → API** 裡建立。）

---

### 第二步：執行

```bash
./scripts/n8n
```

就這樣。會幫你**手動觸發「Run Index 報到 Telegram」**一次。

---

### 其他指令（選用）

| 指令 | 說明 |
|------|------|
| `./scripts/n8n` | 觸發 Run Index 報到 Telegram（預設） |
| `./scripts/n8n list` | 列出所有 workflow |

## n8n production 提醒（不要把密碼寫進 workflow）

- Token / API Key 請放在 n8n container 的環境變數（例如 `~/n8n-production/.env` 或 docker compose env），不要硬寫在 JSON 裡。
- 這些 JSON 可以放心放 repo；真正的敏感值只存在你機器上的 `.env`。
