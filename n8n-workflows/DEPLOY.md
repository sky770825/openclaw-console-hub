# 🚀 n8n 記憶串接 Agent - 全自動化部署清單

## 系統狀態 ✅

| 服務 | 狀態 |
|------|------|
| n8n | ✅ http://localhost:5678 |
| Qdrant | ✅ Collection 'ltm' 已就緒 |
| OpenAI Key | ✅ 已設定 |

---

## 複製貼上即可完成（2 分鐘）

### Step 1: 開啟 n8n
👉 http://localhost:5678

### Step 2: 設定憑證（Credentials）

點擊左側 **Settings** → **Credentials** → **Add Credential**

#### 憑證 1: OpenAI API
```
Name: OpenAI Production
Type: OpenAI API
API Key: sk-proj-M81ZV7un...（已設定在環境變數）
```

#### 憑證 2: Qdrant Local
```
Name: Qdrant Local
Type: Qdrant API
URL: http://host.docker.internal:6333
API Key: （留空）
```

### Step 3: 匯入工作流

1. 左側 **Workflows** → **Import from File**
2. 選擇：`/Users/sky770825/.openclaw/workspace/n8n-workflows/openclaw-memory-agent.json`

### Step 4: 更新憑證引用

開啟工作流後，點擊以下節點更新 Credential：

| 節點 | 選擇憑證 |
|------|----------|
| OpenAI Chat Model | OpenAI Production |
| OpenAI Embeddings | OpenAI Production |
| OpenAI Embeddings Insert | OpenAI Production |
| Vector Store Retriever | Qdrant Local |
| Store to Vector Memory | Qdrant Local |

### Step 5: 啟動

點擊 **Save** → **Activate** 🟢

---

## 測試指令

```bash
# 測試 Webhook
curl -X POST http://localhost:5678/webhook/openclaw-memory \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-1",
    "userMessage": "你好，請問你能記住我們的對話嗎？",
    "context": {}
  }'
```

---

## 整合到 OpenClaw

在 OpenClaw 設定 HTTP Request：

```
方法: POST
URL: http://host.docker.internal:5678/webhook/openclaw-memory
Headers: Content-Type: application/json
Body: {{$json}}
```

---

## 工作流功能

```
[OpenClaw] → [Webhook] → [AI Agent + RAG_MEMORY 工具] → [儲存記憶] → [回應]
```

- ✅ 自動檢索長期記憶（Qdrant）
- ✅ AI 生成回應
- ✅ 自動儲存對話到向量資料庫
- ✅ 支援語義搜尋

---

*部署時間: 2026-02-15 03:24*
