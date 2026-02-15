# n8n 串接（Zeabur）

## 工作流設計

依 [N8N-WORKFLOW-DESIGN.md](./N8N-WORKFLOW-DESIGN.md) 在 n8n 建立工作流：排程執行任務、Telegram 指令、Webhook 接收等。

---

## 一、設定環境變數

在專案根目錄 `.env` 加入：

```
# n8n（Zeabur 部署的 n8n 實例）
N8N_API_URL=https://your-n8n.zeabur.app
N8N_API_KEY=your-n8n-api-key
```

- **N8N_API_URL**：Zeabur 部署 n8n 後的公開網址（例如 `https://n8n-xxx.zeabur.app`）
- **N8N_API_KEY**：在 n8n 介面 → **Settings** → **n8n API** → **Create API key** 建立

> 若使用 n8n 免費試用版，API 可能未啟用，需升級後才能使用。

---

## 二、後端 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/n8n/health` | 檢查 n8n 連線是否正常 |
| GET | `/api/n8n/workflows` | 取得工作流列表（可加 `?active=true` 只取啟用） |
| POST | `/api/n8n/trigger-webhook` | 觸發 n8n Webhook（body 帶 `webhookUrl` 或設 `N8N_WEBHOOK_RUN_NEXT`） |

---

## 三、測試連線

```bash
# 檢查 n8n 連線
curl http://localhost:3011/api/n8n/health

# 取得工作流列表
curl -H "X-N8N-API-KEY:REDACTED" "$N8N_API_URL/api/v1/workflows"
# 或透過我們後端轉發：
curl http://localhost:3011/api/n8n/workflows
```

---

## 四、雙向串接

| 方向 | 說明 |
|------|------|
| **n8n → 任務板** | n8n 用 Cron / Webhook 觸發 → HTTP Request 呼叫 `POST /api/openclaw/run-next` 等 |
| **任務板 → n8n** | 呼叫 `POST /api/n8n/trigger-webhook` 或直接 POST 到 n8n 的 Webhook 節點 URL |

**觸發 n8n 工作流**：在 n8n 建立 Webhook 節點取得 URL，設定 `N8N_WEBHOOK_RUN_NEXT` 或請求時帶 `webhookUrl`，即可觸發該流程。

---

## 五、Zeabur 部署注意事項

1. 在 Zeabur 專案 → **Variables** 加入 `N8N_API_URL`、`N8N_API_KEY`
2. 部署後端後，`/api/n8n/health` 會使用這些變數
3. 若 n8n 與任務板都在 Zeabur，`N8N_API_URL` 可使用 Zeabur 內部服務網址（若有設定）
