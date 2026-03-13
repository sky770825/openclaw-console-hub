# n8n 快速參考卡

> 常用指令與配置速查

---

## 🚀 快速啟動

### Docker Compose 完整配置
```yaml
version: "3.8"

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-password
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - GENERIC_TIMEZONE=Asia/Taipei
    volumes:
      - ~/.n8n:/home/node/.n8n
      - /local-files:/files
```

---

## 🔗 Webhook URL 格式

### 測試環境
```
http://localhost:5678/webhook/<webhook-id>
```

### 生產環境
```
https://your-n8n-domain.com/webhook/<webhook-id>
```

---

## 📦 常用節點代碼片段

### HTTP Request Node
```javascript
// GET 請求
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{$credentials.apiKey}}"
  }
}

// POST 請求
{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "message": "{{$json.message}}",
    "timestamp": "{{$now}}"
  }
}
```

### Function Node (JavaScript)
```javascript
// 處理輸入資料
const items = $input.all();
const results = [];

for (const item of items) {
  results.push({
    json: {
      id: item.json.id,
      name: item.json.name.toUpperCase(),
      processedAt: new Date().toISOString()
    }
  });
}

return results;
```

### Set Node (固定值)
```javascript
{
  "values": {
    "string": [
      {
        "name": "status",
        "value": "processed"
      },
      {
        "name": "bot_name",
        "value": "達爾"
      }
    ]
  }
}
```

---

## 🤖 OpenAI 節點配置

### Chat Model 設置
```javascript
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "你是一個有用的助手"
    },
    {
      "role": "user",
      "content": "{{$json.prompt}}"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 1000
}
```

---

## 📱 Telegram Bot 整合

### 發送訊息
```javascript
{
  "chatId": "{{$json.chat_id}}",
  "text": "{{$json.message}}",
  "parseMode": "Markdown"
}
```

### 接收 Webhook
```
https://your-n8n.com/webhook/telegram-bot
```

---

## 🕐 Cron 表達式

| 頻率 | 表達式 |
|------|--------|
| 每分鐘 | `* * * * *` |
| 每 5 分鐘 | `*/5 * * * *` |
| 每小時 | `0 * * * *` |
| 每天 9:00 | `0 9 * * *` |
| 每週一 9:00 | `0 9 * * 1` |
| 每月 1 號 | `0 0 1 * *` |

---

## 🔐 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `N8N_HOST` | 主機名 | `n8n.example.com` |
| `N8N_PORT` | 埠號 | `5678` |
| `N8N_PROTOCOL` | 協議 | `https` |
| `N8N_BASIC_AUTH_ACTIVE` | 啟用基礎認證 | `true` |
| `N8N_BASIC_AUTH_USER` | 使用者名稱 | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | 密碼 | `password` |
| `WEBHOOK_URL` | Webhook 基礎 URL | `https://n8n.example.com/` |
| `GENERIC_TIMEZONE` | 時區 | `Asia/Taipei` |
| `EXECUTIONS_MODE` | 執行模式 | `regular` |
| `EXECUTIONS_TIMEOUT` | 超時秒數 | `300` |

---

## 🐛 除錯技巧

### 查看執行日誌
1. 進入工作流編輯器
2. 點擊「Executions」分頁
3. 查看每次執行的詳細輸入/輸出

### 測試單一節點
- 選擇節點 → 點擊「Execute Node」

### 使用 No Operation 節點
- 用於檢查資料流中間狀態
- 不執行任何操作，只傳遞資料

---

## 💾 備份與還原

### 備份工作流
```bash
# 匯出所有工作流
n8n export:workflow --all --output=backup.json

# 匯出特定工作流
n8n export:workflow --id=<workflow-id> --output=workflow.json
```

### 還原工作流
```bash
# 匯入工作流
n8n import:workflow --input=backup.json
```

---

## 🔄 與 OpenClaw 整合範例

### OpenClaw → n8n
```bash
# 觸發 n8n Webhook
curl -X POST "https://n8n.example.com/webhook/task-trigger" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "123",
    "task_name": "每日報告",
    "source": "openclaw"
  }'
```

### n8n → OpenClaw API
```javascript
// HTTP Request Node 配置
{
  "url": "http://localhost:18789/api/v1/sessions/send",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{$credentials.openclawToken}}"
  },
  "body": {
    "sessionKey": "main",
    "message": "【n8n通知】任務 {{$json.task_name}} 已完成"
  }
}
```

---

## 📊 效能優化

### 減少記憶體使用
```bash
# 限制執行並發數
export EXECUTIONS_MODE=regular
export EXECUTIONS_TIMEOUT=300

# 清理舊執行記錄
n8n prune:executions --days=30
```

### 資料庫配置（生產環境）
```yaml
# 使用外部 PostgreSQL
environment:
  - DB_TYPE=postgresdb
  - DB_POSTGRESDB_HOST=postgres
  - DB_POSTGRESDB_PORT=5432
  - DB_POSTGRESDB_DATABASE=n8n
  - DB_POSTGRESDB_USER=n8n
  - DB_POSTGRESDB_PASSWORD=password
```

---

## 🎯 常見錯誤排除

| 錯誤 | 原因 | 解決方案 |
|------|------|----------|
| `ECONNREFUSED` | 服務未啟動 | 檢查 n8n 是否運行中 |
| `401 Unauthorized` | 認證失敗 | 檢查 API Key 或 Basic Auth |
| `404 Not Found` | Webhook ID 錯誤 | 確認 Webhook URL 正確 |
| `Timeout` | 執行超時 | 增加 EXECUTIONS_TIMEOUT |
| `Memory Error` | 記憶體不足 | 減少並發或增加記憶體 |

---

*最後更新：2026-02-15*
