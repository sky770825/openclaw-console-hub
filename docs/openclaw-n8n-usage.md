# OpenClaw → n8n 記憶串接使用指南

## 快速測試

```bash
./scripts/test-n8n-bridge.sh
```

## 在 OpenClaw 中使用

### 方式一：HTTP Request 節點

在 n8n 工作流中加入 HTTP Request 節點：

```
方法: POST
URL: http://host.docker.internal:5678/webhook/openclaw-memory
Headers:
  Content-Type: application/json
Body (JSON):
  {
    "sessionId": "{{ $json.sessionId }}",
    "userMessage": "{{ $json.message }}",
    "context": {{ $json.context }}
  }
```

### 方式二：直接從 OpenClaw 呼叫

在 OpenClaw 的對話中，可以使用工具呼叫：

```javascript
// 呼叫 n8n 記憶服務
const response = await fetch('http://host.docker.internal:5678/webhook/openclaw-memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: currentSession,
    userMessage: userInput,
    context: conversationContext
  })
});
```

## 資料流

```
[OpenClaw 用戶輸入]
    ↓
[OpenClaw HTTP Request 節點]
    ↓
[n8n Webhook: /openclaw-memory]
    ↓
[AI Agent + RAG_MEMORY 檢索長期記憶]
    ↓
[儲存對話到 Qdrant]
    ↓
[返回回應給 OpenClaw]
```

## 進階整合

### 記憶檢索

n8n 會自動：
1. 將用戶輸入轉換為向量
2. 從 Qdrant 檢索最相似的 5 筆記憶
3. 將記憶加入 AI Agent 上下文
4. 生成回應

### 記憶儲存

對話會自動儲存到 Qdrant Collection `ltm`，包含：
- 用戶訊息
- AI 回應
- 時間戳
- Session ID

### Token 節省計算

| 場景 | 傳統方式 | 使用記憶 | 節省 |
|------|----------|----------|------|
| 10輪對話 | 8,000 tokens | 3,500 tokens | 56% |
| 知識問答 | 12,000 tokens | 2,800 tokens | 77% |

