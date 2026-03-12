---
name: n8n
description: 與 n8n 自動化平台整合，支援觸發 workflows、查詢執行狀態、雙向 webhook。n8n 運行於 http://localhost:5678。
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["curl", "jq"] },
        "install": [],
      },
  }
---

# n8n 整合技能

本地 n8n 實例運行於 http://localhost:5678（Docker）  
OpenClaw Webhook 接收端：http://localhost:5679

## ✅ 已設定完成

| 組件 | 狀態 | 位置 |
|------|------|------|
| n8n CLI | ✅ | `~/bin/n8n-cli` |
| Webhook 接收端 | ✅ | `~/bin/n8n-webhook` |
| Webhook 服務 | ✅ | http://127.0.0.1:5679 |

## 快速開始

### 1. 設定 n8n API 認證
```bash
n8n-cli auth
# 輸入 n8n URL (預設: http://localhost:5678)
# 輸入 API Key (從 n8n UI → Settings → n8n API 取得)
```

### 2. 測試連線
```bash
n8n-cli status              # 檢查 n8n 服務
n8n-webhook status          # 檢查 webhook 接收端
```

## CLI 指令

### 🔹 n8n-cli - 控制 n8n

```bash
# 認證
n8n-cli auth

# Workflows
n8n-cli workflows list                    # 列出所有 workflows
n8n-cli workflow execute <id>             # 觸發 workflow
n8n-cli workflow execute <id> --data '{"msg":"hello"}'

# 執行紀錄
n8n-cli executions list [limit]           # 列出最近執行
n8n-cli executions get <execution-id>     # 查看執行詳情
```

### 🔹 n8n-webhook - 管理接收端

```bash
n8n-webhook start           # 啟動接收端
n8n-webhook stop            # 停止接收端
n8n-webhook restart         # 重啟接收端
n8n-webhook status          # 查看狀態
```

## 雙向整合

### OpenClaw → n8n (觸發 workflow)
```bash
n8n-cli workflow execute <workflow-id> --data '{"key":"value"}'
```

### n8n → OpenClaw (Webhook 回呼)

在 n8n Workflow 中加入 **HTTP Request** 節點：
- Method: `POST`
- URL: `http://host.docker.internal:5679/webhook/n8n`
- Body: 選擇要傳送的資料

Webhook 端點：
| 端點 | 說明 |
|------|------|
| `http://127.0.0.1:5679/webhook/n8n` | 通用 webhook |
| `http://127.0.0.1:5679/webhook/n8n/notify` | 通知類 webhook |
| `http://127.0.0.1:5679/health` | 健康檢查 |

## 檔案結構

```
~/.openclaw/
├── config/n8n.json              # API 認證設定
├── logs/n8n-webhooks/           # Webhook 接收記錄
│   ├── receiver.log
│   ├── server.log
│   └── webhook_YYYYMMDD_HHMMSS_*.json
└── run/
    └── n8n-webhook-receiver.pid
```

## 環境變數

```bash
export N8N_WEBHOOK_PORT="5679"      # Webhook 接收埠
```

## 注意事項

- n8n 在 Docker 中運行時，要使用 `host.docker.internal` 存取本機服務
- API Key 需從 n8n Web UI → Settings → n8n API 產生
- Webhook 接收端預設使用 port 5679
