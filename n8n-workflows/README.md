# n8n 工作流 JSON 匯入檔

可直接匯入 n8n 的工作流 JSON。在 n8n 右上角選單 → **Import from File** 選擇對應 JSON。

## 檔案一覽

| 檔案 | 工作流名稱 | 說明 |
|------|------------|------|
| `1-run-next-schedule.json` | 排程執行下一個任務 | 每 5 分鐘自動呼叫 run-next |
| `2-run-next-webhook.json` | Webhook 觸發執行下一個任務 | POST 到 `/webhook/run-next` 觸發 |
| `3-openclaw-result-webhook.json` | OpenClaw 結果寫入任務板 | POST 到 `/webhook/openclaw-result` 寫入任務 |

## 前置設定

在 n8n **Settings → Variables** 新增：

| 變數 | 值 |
|------|-----|
| `TASKBOARD_API` | `http://localhost:3011` 或任務板 API 網址 |

本機開發時，n8n（Zeabur）需能存取任務板 API。若任務板在 localhost，可用 ngrok 暴露。

## Webhook URL（工作流啟動後）

- 執行下一個任務：`https://andy825lay.zeabur.app/webhook/run-next`
- 寫入任務結果：`https://andy825lay.zeabur.app/webhook/openclaw-result`

## 詳細設計

見 [docs/N8N-WORKFLOW-DESIGN.md](../docs/N8N-WORKFLOW-DESIGN.md)。
