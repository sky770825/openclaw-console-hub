# OpenClaw 記憶串接 Agent - 設定指南

## 快速設定（3 分鐘）

### Step 1: 匯入工作流

1. 開啟 n8n → **Settings** → **Workflows**
2. 點擊 **Import** → 選擇 `openclaw-memory-agent.json`

### Step 2: 設定 Credentials

需要建立 2 組憑證：

#### 1. OpenAI API Key
- **位置**: Settings → Credentials → Add Credential
- **類型**: OpenAI API
- **API Key**: 你的 OpenAI API Key

#### 2. Qdrant (本地)
- **類型**: Qdrant API
- **URL**: `http://host.docker.internal:6333`
- **API Key**: (留空，本地無認證)

### Step 3: 更新工作流中的 Credential ID

開啟工作流，找到以下節點並選擇正確的 Credential：
- OpenAI Chat Model
- OpenAI Embeddings
- OpenAI Embeddings Insert
- Vector Store Retriever
- Store to Vector Memory

### Step 4: 啟動工作流

點擊 **Save** → **Activate**

Webhook URL: `http://localhost:5678/webhook/openclaw-memory`

---

## 工作流架構

```
[OpenClaw Webhook] 
    ↓
[AI Agent] ← 使用 RAG_MEMORY 工具檢索長期記憶
    ↓
[Prepare Memory Data] → 格式化對話內容
    ↓
[Store to Vector Memory] → 儲存到 Qdrant
    ↓
[Respond to Webhook] → 返回回應
```

---

## 測試方式

```bash
# 測試 Webhook
curl -X POST http://localhost:5678/webhook/openclaw-memory \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-1",
    "userMessage": "請問我之前說過的專案進度？",
    "context": {}
  }'
```

---

## 整合 OpenClaw

在 OpenClaw 中設定 HTTP Request 節點：

```
方法: POST
URL: http://host.docker.internal:5678/webhook/openclaw-memory
Headers: Content-Type: application/json
Body: {{$json}}
```

---

*建立時間: 2026-02-15*
